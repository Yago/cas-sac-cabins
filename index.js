const express = require('express');
const app  = express();
const twig = require('twig');
const port = process.env.PORT || 8080;
const axios = require('axios');
const cheerio = require('cheerio');

const base = 'http://finder.sac-cas.ch';
const list = `${base}/index.php?id=20&L=1`;

const renderKML = async (req, res) => {
  const dom = await axios.get(list);
  const $ = await cheerio.load(dom.data);

  const dataRaw = $('#galleryCollapse > .listing').find('> .hutCols');
  const data = [];

  const total = dataRaw.length;
  let index = 0;

  dataRaw.each(async function (i, elem) {
    const title = $(this).find('.thumb-detail h4').text();
    const altitude = $(this).find('.thumb-detail p').text().replace(' m. alt.', 'm');
    const path = $(this).find('.galerielink').attr('href');
    const link = `${base}/${path}`;

    const itemDOM = await axios.get(link);
    const $$ = await cheerio.load(itemDOM.data);

    const rawCoordinates = $$('#tab2default > div:last-child p').text();
    const rowCoordinates = rawCoordinates.split('(CH1903/LV03)')[1].split('(WGS84)')[0].match(/\d*\.\d*/g);
    const coordinates = rowCoordinates.join(',').concat(',0');

    const thumb = $$('#0').attr('src');
    const thumbPath = `${base}/${thumb}`;

    const description1 = $$('#tab1default > div > p').html();
    const description2 = $$('#tab1default > div + div > p').html();
    const description3 = $$('#tab2default > div > p').html();

    data.push({
      title,
      altitude,
      coordinates,
      thumbPath,
      link,
      description: description1 + description2 + description3
    });

    index += 1;
    if (index === total) {
      res.set('Content-Type', 'text/kml');
      res.set('Content-Disposition', 'inline; filename="cas_sac_cabins.kml"');
      res.render('template.twig', { data });  
    }
  });

};

app.set('view engine', twig);
app.set('views', './');
app.get('/', renderKML);

app.listen(port, () => {
  console.log(`Open http://localhost:${port} to download the KML file !`)
})
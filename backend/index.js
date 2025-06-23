const express = require('express');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());


app.post('/api/query_properties', async (req, res) => {
  const { lastName, streetName, cityName } = req.body;
  const normalizedCity = cityName ? cityName.toLowerCase().trim() : '';

  const apiSupportedCities = {
    somerville: 'somervillema',
    medford: 'medfordma',
    lexington: 'lexingtonma',
    sharon: 'sharonma',
    westwood: 'westwoodma',
    woburn: 'woburnma',
    watertown: 'watertownma'
  };

  const csvFiles = {
    boston: 'fy2025-property-assessment.csv',
    belmont: 'belmont-properties.csv'
  };

  try {
    if (normalizedCity === 'all') {
      const apiPromises = Object.entries(apiSupportedCities).map(([city, cityPath]) => 
        searchExternalApi(cityPath, lastName, streetName, city)
      );

      const csvPromises = Object.entries(csvFiles).map(([city, fileName]) => {
        const filePath = path.join(__dirname, fileName);
        return searchCsv(filePath, lastName, streetName, city);
      });

      const allPromises = [...apiPromises, ...csvPromises];
      const settledResults = await Promise.allSettled(allPromises);
      
      const allProperties = settledResults
        .filter(result => result.status === 'fulfilled' && Array.isArray(result.value))
        .flatMap(result => result.value);
      
      res.json({ properties: allProperties });

    } else if (apiSupportedCities[normalizedCity]) {
      const cityPath = apiSupportedCities[normalizedCity];
      const properties = await searchExternalApi(cityPath, lastName, streetName, normalizedCity);
      res.json({ properties });
    } else if (csvFiles[normalizedCity]) {
      const filePath = path.join(__dirname, csvFiles[normalizedCity]);
      const properties = await searchCsv(filePath, lastName, streetName, normalizedCity);
      res.json({ properties });
    } else {
      res.status(400).json({ error: 'City not supported.' });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

async function searchExternalApi(cityPath, lastName, streetName, cityName) {
  try {
    const initialUrl = streetName
      ? `https://gis.vgsi.com/${cityPath}/async.asmx/GetDataAddress`
      : `https://gis.vgsi.com/${cityPath}/async.asmx/GetData2`;

    const initialBody = streetName
      ? { inVal: streetName, src: 'i_address' }
      : { inVal: lastName, src: 'i_owner' };

    if (!streetName && !lastName) {
      return [];
    }

    const initialResponse = await fetch(initialUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initialBody),
    });

    const initialData = await initialResponse.json();
    
    const detailPromises = (initialData.d.records || initialData.d).map(async (item) => {
      const detailUrl = `https://gis.vgsi.com/${cityPath}/Parcel.aspx?Pid=${item.id}`;
      const detailResponse = await fetch(detailUrl);
      const html = await detailResponse.text();
      const $ = cheerio.load(html);

      const urlObject = new URL(detailUrl);
      const baseUrl = `${urlObject.protocol}//${urlObject.host}${path.dirname(urlObject.pathname)}/`;
      $('head').prepend(`<base href="${baseUrl}">`);

      const owner = $('#MainContent_lblGenOwner').text();
      const address = $('#MainContent_lblLocation').text();
      const totalValue = $('#MainContent_lblGenAssessTot').text();
      const landUse = $('#MainContent_lblGenUse').text();
      const zipcode = $('#MainContent_lblGenZip').text();

      console.log("html--------------------------------\n", html);

      return { owner, address, totalValue, landUse, zipcode, city: cityName, html: $.html() };
    });

    const properties = await Promise.all(detailPromises);
    
    let filteredProperties = properties;

    if (streetName && lastName) {
      filteredProperties = properties.filter(p => p.owner.toLowerCase().includes(lastName.toLowerCase()));
    }
    
    return filteredProperties;

  } catch (error) {
    console.error(`Error fetching ${cityName} data:`, error);
    throw error;
  }
}

const useCodeMapping = {
  '101': 'Single Family',
  '102': 'Condominium',
  '103': 'Mobile Home',
  '104': 'Two-Family',
  '105': 'Three-Family',
  '106': 'Accessory Land with Improvement',
  '109': 'Multiple Houses on one parcel',
  '111': 'Four to Eight Units',
  '112': 'More than Eight Units',
  '121': 'Rooming and Boarding Houses',
  '122': 'Fraternity and Sorority Houses',
  '123': 'Residence Halls or Dormitories',
  '124': 'Rectories, Convents, Monasteries',
  '125': 'Other Congregate Housing',
  '130': 'Developable Land',
  '131': 'Potentially Developable Land',
  '132': 'Undevelopable Land',
  '140': 'Child Care Facility',
  '317': 'Farm Buildings',
  '318': 'Commercial Greenhouses'
};

function searchCsv(filePath, lastName, streetName, cityName) {
  return new Promise((resolve, reject) => {
    const results = [];
    const isBelmont = path.basename(filePath) === 'belmont-properties.csv';

    fs.createReadStream(filePath)
      .on('error', (err) => reject(err))
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim()
      }))
      .on('data', (data) => {
        let owner = '';
        let address = '';
        let fullStreetForSearch = '';
        let zipcode = '';
        let landUse = '';
        let totalValue = '';
        let city = '';

        if (isBelmont) {
          owner = data.OWNER1 ? data.OWNER1.trim() : '';
          address = data.SITE_ADDR || '';
          fullStreetForSearch = address.trim(); // Search the full address for street name
          zipcode = data.ZIP ? data.ZIP.trim() : '';
          landUse = useCodeMapping[data.USE_CODE] || (data.STYLE ? data.STYLE.trim() : '');
          totalValue = data.TOTAL_VAL;
          city = data.CITY ? data.CITY.trim() : '';
        } else { // Assuming Boston
          owner = data.OWNER || '';
          const stNum = data.ST_NUM ? data.ST_NUM.trim() : '';
          const stName = data.ST_NAME ? data.ST_NAME.trim() : '';
          fullStreetForSearch = `${stNum} ${stName}`;
          address = `${fullStreetForSearch} ${data.UNIT_NUM ? '# ' + data.UNIT_NUM : ''}`.trim();
          zipcode = data.ZIP_CODE;
          landUse = data.LU_DESC;
          totalValue = data.TOTAL_VALUE;
          city = data.CITY || '';
        }

        const ownerMatch = !lastName || owner.toLowerCase().includes(lastName.toLowerCase());
        const streetMatch = !streetName || fullStreetForSearch.toLowerCase().includes(streetName.toLowerCase());
        
        // Since we know the file is for Boston, we can be more lenient with the city match.
        const cityMatch = !isBelmont || !cityName || city.toLowerCase().includes(cityName.toLowerCase());

        if (ownerMatch && streetMatch && cityMatch) {
          results.push({ owner, address, zipcode, landUse, totalValue, city: city || cityName, html: null });
        }
      })
      .on('end', () => {
        resolve(results);
      });
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

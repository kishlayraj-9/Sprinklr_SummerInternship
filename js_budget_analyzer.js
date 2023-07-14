const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const yargs = require('yargs');

yargs
.option('url', {
  type: 'string'
})
.option('totalBudget', {
  type: 'number'
})
.option('totalUnusedBudget', {
  type: 'number'
})
.argv;

const { url, totalBudget, totalUnusedBudget } = yargs.argv;

function sort_object(given_obj){
  var sortedObj = {};
  Object.entries(given_obj)
  .sort(function(a, b) {
    return b[1] - a[1] ; // Sort based on values (ascending order)
  })
  .forEach(function(entry) {
    sortedObj[entry[0]] = entry[1];
  });
  return sortedObj;
}

async function analyzeBuildSize() {

  var resourceSizes = {};
  let totalResourceSize=0;

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless']
  });

  const puppeteerOptions = {
    executablePath: chrome.chromePath,
  };

  const browser = await puppeteer.launch(puppeteerOptions);
  const page = await browser.newPage();
  await page.setRequestInterception(true);

  page.on('request', (request) => {
    request.continue();
  });

  page.on('response', async (response) => {
    const url = await response.url();
    const headers = await response.headers();
    if(url.endsWith('.js')){
      const contentLength = headers['content-length'];
      totalResourceSize+=contentLength/1024;
      resourceSizes[url] = (contentLength/1024).toFixed(2);
    }
  });

  await page.goto(url);

  if(totalResourceSize > totalBudget){
    console.log('Gzip Resource Size:\n\n');

    resourceSizes = sort_object(resourceSizes);
    for (const [url, size] of Object.entries(resourceSizes)) {
      console.log(url,"  :  ", size, 'kB\n\n');
    }
    console.log("\nTotal Gzip Resource Size: ", totalResourceSize.toFixed(2), "kB\n\n\n");
  }

  var feedbackSizes = {};
  let totalUnusedSizes = 0;
  
  const options = {
    port: chrome.port,
    output: 'json',
    onlyCategories: ['performance'],
    onlyAudits: ['unused-javascript'],
  };

  const runnerResult = await lighthouse(url, options);

  runnerResult.lhr.audits['unused-javascript'].details.items.map((x) => {
    const url = x.url;
    const unUsedSize = (x.wastedBytes/1024).toFixed(2);
    feedbackSizes[url]=unUsedSize;
    totalUnusedSizes += x.wastedBytes/1024;
  })

  if(totalUnusedSizes > totalUnusedBudget){

    feedbackSizes = sort_object(feedbackSizes);

    console.log("LightHouse Unused Code Analysis\n");
    for (const [url, unUsedSize] of Object.entries(feedbackSizes)) {
      console.log(url,"  :  ", unUsedSize, 'kB\n\n');
    }
    console.log("\nTotal Unused Size : ", totalUnusedSizes.toFixed(2), "kB\n");
  }

  if(totalResourceSize <= totalBudget && totalUnusedSizes <= totalUnusedBudget){
    console.log("Worked fine!!");
  }

  await browser.close();
  await chrome.kill();
}

analyzeBuildSize();



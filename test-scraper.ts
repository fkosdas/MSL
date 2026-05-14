import { scrapeCabinetData } from './backend-services/cabinetScraper.ts';
scrapeCabinetData('https://example.com').then(console.log).catch(console.error);

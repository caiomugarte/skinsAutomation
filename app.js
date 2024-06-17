const axios = require("axios");
const fs = require("fs");
const path = require("path");

const baseURL = "https://tradeit.gg/api/v2/inventory/data";

const params = {
  gameId: 730,
  offset: 0,
  limit: 100,
  sortType: "Price - high",
  searchValue: "knife",
  maxPrice: 171.61,
  minFloat: 0,
  maxFloat: 1,
  /* type: 6, */
  showTradeLock: false,
  onlyTradeLock: false,
  colors: "",
  showUserListing: true,
  stickerName: "",
  fresh: true,
  isForStore: 0,
};

const headers = {
  Referer: "https://tradeit.gg/csgo/trade/knife",
};

const exchangeUrl = "https://tradeit.gg/api/v2/exchange-rate";

const getDolarPrice = async () => {
  try {
    const response = await axios.get(exchangeUrl, { headers });
    return response.data.rates.BRL;
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    return null;
  }
};

const getItemsTradeit = async () => {
  const itemsTradeit = [];

  try {
    const response = await axios.get(baseURL, { params, headers });
    const data = response.data;
    const items = data.items;
    const dolarPrice = await getDolarPrice();

    if (dolarPrice) {
      items.forEach((item) => {
        const itemTradeit = {};
        itemTradeit.id = item.id;
        itemTradeit.nome = item.name;
        itemTradeit.precoTradeit = (item.price * dolarPrice) / 100;
        itemsTradeit.push(itemTradeit);
      });
    } else {
      console.error("Failed to get dollar price");
    }
  } catch (error) {
    console.error("Error:", error);
  }

  return itemsTradeit;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DELAY = 10000;
const fetchSteamPrices = async (itemsTradeit) => {
  for (const item of itemsTradeit) {
    try {
      await fillSteamPriceForItem(item);
    } catch (error) {
      console.error(`Error fetching Steam price for ${item.nome}:`, error);
      await delay(DELAY);
      console.log('Fetching again');
      try {
        await fillSteamPriceForItem(item);
      } catch (error) {
        console.error(`Failed again fetching Steam price for ${item.nome}:`, error);
      }
    }

    await delay(DELAY);
  }
};

const trataItemsTradeit = (itemsTradeit) => {
  // Calcular a diferença
  for (const item of itemsTradeit) {
    const precoSteam = item.precoSteam;
    const precoTradeit = item.precoTradeit;
    item.diferenca = precoTradeit - precoSteam;
  }

  // Filtrar itens com diferença igual a NaN
  const validItems = itemsTradeit.filter((item) => !isNaN(item.diferenca));

  // Classificar itens pela menor diferença
  validItems.sort((a, b) => a.diferenca - b.diferenca);

  return validItems;
};

const saveItemsToFile = (itemsTradeit) => {
  const filePath = path.join(
    __dirname,
    `itemsTradeit-${params.searchValue}.json`
  );
  fs.writeFileSync(filePath, JSON.stringify(itemsTradeit, null, 2), "utf-8");
  console.log(`Data saved to ${filePath}`);
};

const main = async () => {
  const itemsTradeit = await getItemsTradeit();
  await fetchSteamPrices(itemsTradeit);

  const sortedItems = trataItemsTradeit(itemsTradeit);
  saveItemsToFile(sortedItems);
  console.log(sortedItems);
};

main();

async function fillSteamPriceForItem(item) {
  /* const steamParams = {
    start: 0,
    count: 1,
    currency: 7,
    language: "portuguese",
    format: "json",
  }; */
	const steamParams = {
		start: 0,
		count: 1,
		appid: 730, 
		currency: 7,
		market_hash_name: item.nome
	}

/*   const steamBaseUrl = `https://steamcommunity.com/market/listings/730/${item.nome}/render`; */
	const steamBaseUrl = `https://steamcommunity.com/market/priceoverview`
  const response = await axios.get(steamBaseUrl, { params: steamParams });
  console.log(`Steam price for ${item.nome}:`, response.data);
	item.precoSteam = parseFloat(response.data.lowest_price.replace(',', '.').replace('R$ ', ""));
  /* const key = Object.keys(response.data.listinginfo)[0]; */
  /* if (key) {
    item.precoSteam = (response.data.listinginfo[key].converted_price + response.data.listinginfo[key].converted_fee) / 100;
  } else {
    console.error(`No listing info for ${item.nome}, retrying...`);
    await delay(DELAY);
    try {
      await fillSteamPriceForItem(item);
    } catch (error) {
      console.error(`Failed again fetching Steam price for ${item.nome}:`, error);
    }
  } */
}

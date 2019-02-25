import {
  InternalLinks,
  AIRTABLE_ASSETS_RULES,
  AIRTABLE_CATEGORIES_RULES,
  PULL_ASSETS_TIME,
  PULL_CATEGORIES_TIME,
  verifyDataAirtable,
} from 'constants';

import {
  fetchWithCache,
} from 'utils/fetchWithCache';

const { Provider, Consumer } = React.createContext({});

// Required so we can trigger getInitialProps in our exported pages
export const withAirtableContext = (Component) => {
  return class Higher extends React.Component{
    static getInitialProps(ctx) {
      if(Component.getInitialProps)
        return Component.getInitialProps(ctx);
      else return {};
    }
    render(){
      return (
        <Consumer>
          {state => <Component {...this.props} airtableContext={state} />}
        </Consumer>
      )
    }
  }
}

class AirtableProvider extends React.PureComponent {
  constructor(props){
    super(props);
    this.state = {
      getCategoriesForAssets: this.getCategoriesForAssets,
      getAssetByName: this.getAssetByName,
      forceRefresh: this.forceRefresh,
    }
    this.categoriesEtag = '';
    this.assetsEtag = '';
  }

  componentDidMount = () => {
    this.getAssets();
    this.getCategories();
    this.setIntervals();
  }

  componentWillUnmount = () => {
    this.resetIntervals();
  }

  setIntervals = () => {
    this.intervalPullAssets = setInterval(this.getAssets, 10000)
    this.intervalPullCategories = setInterval(this.getCategories, PULL_CATEGORIES_TIME)
  }

  resetIntervals = () => {
    clearInterval(this.intervalPullAssets);
    clearInterval(this.intervalPullCategories);
  }

  forceRefresh = async () => this.getAssets()

  processAssetsFromAirTable = ({ fields }) => {
    let location = undefined;
    if(fields.Location){
      let countries = fields.Location.split(',');
      location = {};
      countries.forEach(country => {
        country = country.trim();
        let cities = /\(([^)]+)\)/g.exec(country);

        if(cities){
          country = country.substring(0, country.indexOf('('))
          cities = cities[1].split(';');
          location[country] = cities;
        } else {
           location[country] = {};
        }
      })
    }

    return {
      name: fields.Asset,
      category: fields.Category,
      description: fields.Description,
      details: fields.Details,
      partner: fields.Partner,
      imageSrc: `${InternalLinks.S3}assetImages:${fields.Image}`,
      amountToBeRaisedInUSDAirtable: fields['Funding goal'],
      assetIDs: fields['Asset IDs'],
      location,
    };
  }

  processCategoriesFromAirTable = (data) => {
    const categories = {};
    data.forEach(({ fields }) => {
      categories[fields.Category] = {
        contractName: fields['Category Contract'],
        encoded: fields['byte32'],
      }
    })
    return categories;
  }

  getAssetByName = (assetName, assetsFromAirTable) => {
    const tmpAsset = Object.assign({}, assetsFromAirTable.filter(asset => asset.name === assetName)[0]);
    tmpAsset.location = undefined;
    return tmpAsset;
  }

  processAssetsByIdFromAirTable = (assetsFromAirTable) => {
    const assetsAirTableById = {};
    const tmpCache = {};
    assetsFromAirTable.forEach(asset => {
      let assetIds = asset.assetIDs;
      if(assetIds){
        const assetName = asset.name;
        const airtableAsset = tmpCache[assetName] || this.getAssetByName(assetName, assetsFromAirTable);
        // add to temporary cache (will help when we have a lot of assets)
        if(airtableAsset && !tmpCache[assetName]){
          tmpCache[assetName] = airtableAsset;
        }
        assetIds = assetIds.split(',');
        assetIds.forEach(assetIdInfo => {
          const [assetId, country, city, collateral, collateralPercentage] = assetIdInfo.split('|');
          airtableAsset.city = city;
          airtableAsset.country = country;
          airtableAsset.collateral = Number(collateral);
          airtableAsset.collateralPercentage = collateralPercentage;
          assetsAirTableById[assetId] = airtableAsset;
        })
      }
    })
    return assetsAirTableById;
  }

  getCategories = async () => {
    const response = await fetchWithCache(InternalLinks.AIRTABLE_CATEGORIES, 'assetsCategories', this);
    // avoid processing and setting state if the data hasn't changed
    if(!response.isCached) {
      const { records } = response.data;

      const filteredCategoriesFromAirtable = verifyDataAirtable(AIRTABLE_CATEGORIES_RULES, records);

      const categoriesAirTable = this.processCategoriesFromAirTable(filteredCategoriesFromAirtable);
      this.setState({
        categoriesAirTable
      });
    }
  }

  getAssets = async () => {
    const response = await fetchWithCache(InternalLinks.AIRTABLE_ASSETS, 'assetsEtag', this);
    // avoid processing and setting state if the data hasn't changed
    if(!response.isCached) {
      const { records } = response.data;

      const filteredAssetsFromAirtable = verifyDataAirtable(AIRTABLE_ASSETS_RULES, records);

      let assetsAirTable = filteredAssetsFromAirtable.map(this.processAssetsFromAirTable)
      const assetsAirTableById = this.processAssetsByIdFromAirTable(assetsAirTable);

      // remove assetIDs as they are not required in this object
      // they were requred before to facilitate the processing by asset ID
      assetsAirTable = assetsAirTable.map(asset => {
        delete asset.AssetIDs;
        return {
          ...asset,
        };
      })

      this.setState({
        assetsAirTable,
        assetsAirTableById,
      });
    }
  }

  getCategoriesForAssets = (country, city) => {
    const {
      assetsAirTable,
      categoriesAirTable,
    } = this.state;

    let categories = [];
    for(const asset of assetsAirTable){
      if(categories.includes(asset.category)){
        continue;
      }
      if(!asset.location){
        categories.push(categoriesAirTable[asset.category] ? asset.category : undefined);
      } else if (asset.location && asset.location.country === country && (!asset.location.cities || asset.location.cities.includes(city.toLowerCase()))){
        categories.push(categoriesAirTable[asset.category] ? asset.category : undefined);
      }
    }
    return categories;
  }

  render(){
    return (
      <Provider value={this.state}>
        {this.props.children}
      </Provider>
    )
  }
};

export default AirtableProvider;

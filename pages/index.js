import { compose } from 'recompose'
import { withMetamaskContextPageWrapper } from 'components/MetamaskContext';
import { withAssetsContextPageWrapper } from 'components/AssetsContext';
import { LocalStorageKeys } from 'constants/localStorageKeys';
import {
  getValueFromLocalStorage,
} from 'utils/helpers';
import AssetExplorer from 'components/AssetExplorer';
import Loading from 'components/Loading';
import { METAMASK_ERRORS } from 'components/MetamaskContext/constants';
import MetamaskErrors from 'components/MetamaskErrors';
import { RampInstantSDK } from '@ramp-network/ramp-instant-sdk';

const Explore = ({
  assetsContext,
  metamaskContext,
}) => {
  const {
    assets,
    loadingAssets,
  } = assetsContext;
  // const hasMetamaskErrors = metamaskContext.metamaskErrors();
  // if(hasMetamaskErrors.error){
  //   return (
  //     <MetamaskErrors
  //       shouldRenderComponent={false}
  //     />
  //   )
  // }
  if (loadingAssets) {
  // <a href="https://buy.ramp.network/" target="_blank">Go to Ramp Instant</a>;
  // new RampInstantSDK({
  //   hostAppName: 'MYB test',
  //   hostLogoUrl: 'https://rory-my-bit-go-app-test.vercel.app/',
  //   variant: 'embedded-desktop',
  //   containerNode: document.getElementById('ramp-container'),
  // }).show();
   return <Loading message="Loading assets" />;
  } else {
    return (
      <a href="https://buy.ramp.network/" target="_blank">Go to Ramp Instant</a>
      // <AssetExplorer
      //   assets={assets}
      //   EXPLORE_PAGE_FUNDING_ACTIVE={LocalStorageKeys.EXPLORE_PAGE_FUNDING_ACTIVE}
      //   EXPLORE_PAGE_SORT_BY={LocalStorageKeys.EXPLORE_PAGE_SORT_BY}
      //   EXPLORE_PAGE_SELECTED_FILTERS={LocalStorageKeys.EXPLORE_PAGE_SELECTED_FILTERS}
      //   useLocalStorage
      //   />

    )
  }
};

const enhance = compose(
  withAssetsContextPageWrapper,
  withMetamaskContextPageWrapper,
);

export default enhance(Explore);

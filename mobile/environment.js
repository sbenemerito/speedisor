import Constants from 'expo-constants'


const ENV = {
  dev: {
     apiUrl: 'http://192.168.1.12:5001'
  },
  staging: {
     apiUrl: "[staging.api.here]"
     // Other keys
  },
  prod: {
    apiUrl: "http://speedisor.sbenemerito.xyz"
    // Other keys
  }
};

const getEnvVars = (env = Constants.manifest.releaseChannel) => {
  // The __DEV__ variable is set to true when react-native is in Dev mode.
  // __DEV__ is true when run locally, but false when published.
  if (__DEV__) {
     return ENV.dev;
  } else if (env === 'staging') {
     return ENV.staging;
  } else if (env === 'prod') {
     return ENV.prod;
  }
};

export default getEnvVars;
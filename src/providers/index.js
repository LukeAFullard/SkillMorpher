(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./browser-local-provider'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./browser-local-provider'));
  } else {
    root.TranslationProviders = factory(root.BrowserLocalProvider);
  }
}(typeof self !== 'undefined' ? self : this, function (BrowserLocalProvider) {
  'use strict';

  const providers = {
    'browser-local': new BrowserLocalProvider()
  };

  function getProvider(id = 'browser-local') {
    return providers[id] || providers['browser-local'];
  }

  function registerProvider(id, instance) {
    providers[id] = instance;
  }

  return {
    providers,
    getProvider,
    registerProvider
  };
}));

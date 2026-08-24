(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./ollama-provider'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./ollama-provider'));
  } else {
    root.TranslationProviders = factory(root.OllamaProvider);
  }
}(typeof self !== 'undefined' ? self : this, function (OllamaProvider) {
  'use strict';

  const providers = {
    ollama: new OllamaProvider()
  };

  function getProvider(id = 'ollama') {
    return providers[id] || providers.ollama;
  }

  return {
    providers,
    getProvider
  };
}));

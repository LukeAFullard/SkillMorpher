(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Targets = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TARGETS = {
    geminiSpark: {
      id: 'geminiSpark',
      name: 'Gemini Spark',
      maxPackageSize: 100 * 1024 * 1024, // 100 MB
      allowedExtensions: ['txt', 'md', 'rst', 'rtf', 'tex', 'log', 'py', 'sh', 'json', 'yaml', 'yml', 'csv', 'toml', 'xml', 'env', 'sql', 'html', 'css', 'svg'],
      allowedBasenames: ['makefile', 'dockerfile'],
      disallowNetworkAccess: true,
      disallowExternalWeb: true,
      supportedCapabilities: {
        shellExecution: 'supported', // Gemini command execution where available
        pythonExecution: 'supported',
        fileRead: 'supported',
        fileWrite: 'supported',
        toolCalling: 'supported',
        webAccess: 'blocked',
        webSearch: 'blocked',
        browserAutomation: 'blocked',
        computerUse: 'blocked',
        networkAccess: 'blocked',
        mcpServer: 'blocked',
        cloudApi: 'blocked'
      }
    },
    geminiCli: {
      id: 'geminiCli',
      name: 'Gemini CLI (Experimental / Unverified)',
      experimental: true,
      description: 'Experimental CLI target profile (unverified SKILL.md package support)',
      maxPackageSize: 200 * 1024 * 1024, // 200 MB
      allowedExtensions: '*', // flexible runtime
      allowedBasenames: '*',
      disallowNetworkAccess: false,
      disallowExternalWeb: false,
      supportedCapabilities: {
        shellExecution: 'supported',
        pythonExecution: 'supported',
        fileRead: 'supported',
        fileWrite: 'supported',
        toolCalling: 'supported',
        webAccess: 'warn',
        webSearch: 'supported',
        browserAutomation: 'blocked',
        computerUse: 'blocked',
        networkAccess: 'warn',
        mcpServer: 'warn',
        cloudApi: 'warn'
      }
    }
  };

  return {
    TARGETS
  };
}));

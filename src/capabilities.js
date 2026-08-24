(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Capabilities = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CAPABILITIES = {
    shellExecution: { name: 'Shell / Command Execution', risk: 'high' },
    pythonExecution: { name: 'Python Code Execution', risk: 'medium' },
    fileRead: { name: 'File Read / Search', risk: 'low' },
    fileWrite: { name: 'Direct File Modification', risk: 'medium' },
    webAccess: { name: 'External Web Access / Scraping', risk: 'high' },
    webSearch: { name: 'Web Search', risk: 'medium' },
    browserAutomation: { name: 'Interactive Browser Automation', risk: 'high' },
    computerUse: { name: 'Desktop UI / Computer Use', risk: 'critical' },
    networkAccess: { name: 'Network / HTTP API Calls', risk: 'high' },
    imageGeneration: { name: 'Image Generation', risk: 'low' },
    codeExecution: { name: 'Generic Code Execution', risk: 'medium' },
    toolCalling: { name: 'Tool Calling Syntax', risk: 'low' },
    mcpServer: { name: 'Model Context Protocol (MCP) Server', risk: 'high' },
    cloudApi: { name: 'Platform Cloud API Dependency', risk: 'high' },
    environmentVars: { name: 'Environment Variables / Keys', risk: 'medium' },
    filesystemPath: { name: 'Hardcoded Filesystem Path', risk: 'low' },
    cliCommand: { name: 'CLI Command Syntax', risk: 'medium' },
    platformRef: { name: 'Platform Terminology Reference', risk: 'low' }
  };

  function buildCapabilityRequirements(detections) {
    return (detections || []).map(det => {
      let confidence = 0.95;
      if (det.platform === 'Generic') confidence = 0.85;
      if (det.term === 'Bash' || det.term === 'str_replace') confidence = 0.99;
      if (det.term === 'computer_use') confidence = 0.99;
      if (det.term === 'code_interpreter') confidence = 0.99;

      return {
        capability: det.capability,
        source: `${det.platform} ${det.term}`,
        location: `SKILL.md:${det.line}`,
        line: det.line,
        lineContent: det.lineContent,
        confidence
      };
    });
  }

  return {
    CAPABILITIES,
    buildCapabilityRequirements
  };
}));

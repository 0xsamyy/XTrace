import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 8080),
  xrpl: {
    mainnetWss: process.env.XRPL_MAINNET_WSS || 'wss://xrplcluster.com',
    testnetWss:
      process.env.XRPL_TESTNET_WSS || 'wss://s.altnet.rippletest.net:51233',
    requestTimeoutMs: Number(process.env.XRPL_REQUEST_TIMEOUT_MS || 20000)
  }
};

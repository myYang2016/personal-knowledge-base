import Head from 'next/head';
import Script from 'next/script';

export default function Header() {
  return <>
    <Head>
      <title>POLYV Video Analysis</title>
      <meta name="viewport" content="initial-scale=1, width=device-width" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
    <Script src="https://player.polyv.net/script/player.js"></Script>
  </>
}
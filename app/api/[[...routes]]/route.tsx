/** @jsxImportSource frog/jsx */

import { Button, Frog, TextInput } from 'frog'
import { devtools } from 'frog/dev'
// import { neynar } from 'frog/hubs'
import { handle } from 'frog/next'
import { serveStatic } from 'frog/serve-static'
import { createWalletClient, http, createPublicClient, parseEther } from "viem";
import { seededRandom, randomString, combineHashes } from '../_utils/utils'
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import abi from "../_utils/abi.json"
import prisma from '../../../lib/prisma';

const app = new Frog({
  assetsPath: "/",
  basePath: `/api`,
  // Supply a Hub to enable frame verification.
  // hub: neynar({ apiKey: 'NEYNAR_FROG_FM' }),
  imageOptions: {
    format: "png"
  }
})

// Uncomment to use Edge Runtime
// export const runtime = 'edge'

const account = privateKeyToAccount(process.env.PRIVATE_KEY as "0x");
const contractAddress = process.env.CONTRACT_ADDRESS as "0x"
const blockExplorer = process.env.BLOCK_EXPLORER
const chainId = process.env.CHAIN_ID

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
});

app.frame("/", async (c) => {
  return c.res({
    action: `/select-multipler`,
    image: <img src='https://degen-flip-base-hidden.vercel.app/1.png' />,
    imageAspectRatio: "1.91:1",
    intents: [
      <TextInput placeholder="Amount $DEGEN" />,
      <Button value="heads">
        HEADS 🟡
      </Button>,
      <Button value="tails">
        TAILS ⚪️
      </Button>,
      <Button value="sponsor">
        Sponsor!
      </Button>,
      <Button.Link href={`https://warpcast.com/~/compose?text=Flip+a+coin+and+win+upto+5x+%24DEGEN%21&embeds[]=https://degen-flip.vercel.app/api`}>
        Share
      </Button.Link>,
    ],
    title: "DEGEN FLIP",
  });
});

app.frame("/select-multipler", async (c) => {
  const { buttonValue, inputText } = c
  if (!inputText) {
    return c.res({
      action: `/`,
      image: <div
        style={{
          alignItems: 'center',
          background: '#443664',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          height: '100%',
          justifyContent: 'center',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            color: '#d7dbde',
            fontSize: 60,
            fontStyle: 'normal',
            letterSpacing: '-0.025em',
            lineHeight: 1.4,
            marginTop: 30,
            padding: '0 120px',
            whiteSpace: 'pre-wrap',
          }}
        >
          Please enter a valid amount!
        </div>
      </div>,
      imageAspectRatio: "1.91:1",
      intents: [
        <Button>
          Back
        </Button>
      ]
    })
  }
  if (buttonValue == "sponsor" && inputText) {
    return c.res({
      action: '/',
      image: <img src='https://degen-flip-base-hidden.vercel.app/1.png' />,
      imageAspectRatio: "1.91:1",
      intents: [
        <Button.Reset>
          Back
        </Button.Reset>,
        <Button.Transaction target={`/sponsor/${encodeURI(inputText)}`}>
          Send!
        </Button.Transaction>,
      ]
    })
  }
  if (inputText && inputText > "1000") {
    return c.res({
      action: `/`,
      image: <img src='https://degen-flip-base-hidden.vercel.app/1.png' />,
      imageAspectRatio: "1.91:1",
      intents: [
        <Button>
          Back
        </Button>,
        <Button>
          Cannot fund your bet, please sponsor!
        </Button>
      ]
    })
  }
  return c.res({
    action: `/flip/${buttonValue}/${encodeURI(inputText as string)}`,
    image: <div
      style={{
        alignItems: 'center',
        background: '#443664',
        backgroundSize: '100% 100%',
        display: 'flex',
        flexDirection: 'column',
        flexWrap: 'nowrap',
        height: '100%',
        justifyContent: 'center',
        textAlign: 'center',
        width: '100%',
        color: '#d7dbde',
        padding: "0 120px",
        fontSize: 32
      }}
    >
      <img src='https://degen-flip-base-hidden.vercel.app/2.png' />
      <span>You can reset the parameters in the next step!</span>
    </div>,
    imageAspectRatio: "1.91:1",
    intents: [
      <Button value='125'>
        1.25x
      </Button>,
      <Button value='150'>
        1.5x
      </Button>,
      <Button value='200'>
        2x
      </Button>,
      <Button value='500'>
        5x
      </Button>
    ],
    title: "Select Multipler",
  })
})

app.frame('/flip/:action/:amount', async (c) => {
  const multiplier = encodeURI(c.buttonValue as string)
  const action = c.req.param('action')
  const amount = c.req.param('amount')
  return c.res({
    action: `/bet/${action}/${amount}/${multiplier}`,
    image: <img src='https://degen-flip-base-hidden.vercel.app/2.png' />,
    imageAspectRatio: "1.91:1",
    intents: [
      <Button.Reset>
        Reset
      </Button.Reset>,
      <Button.Transaction target={`/bet/${amount}`}>
        Place Bet!
      </Button.Transaction>
    ]
  })
})

app.transaction('/bet/:amount', (c) => {
  const amount = decodeURI(c.req.param("amount"))
  return c.contract({
    abi: abi.abi,
    chainId: `eip155:${chainId}` as any,
    functionName: 'deposit',
    to: contractAddress,
    value: parseEther(amount)
  })
})

app.frame("/bet/:action/:amount/:multiplier", async (c) => {
  const multiplier = decodeURI(c.req.param('multiplier') as string)
  const action = c.req.param('action')
  const amount = decodeURI(c.req.param('amount'))
  const txnHash = c.transactionId
  const choice = action == "heads" ? 0 : 1

  const randHash = await (await fetch("https://api.drand.sh/public/latest")).json()
  const psuedoHash = randomString(Math.floor(Math.random() * (512 - 64 + 1)) + 64)
  const hash = combineHashes(randHash, psuedoHash)
  const result = seededRandom(hash, Number(multiplier), action == "heads" ? 0 : 1)
  const hasWon = result == 0 ? true : false
  const txn = await publicClient.waitForTransactionReceipt({ hash: txnHash as "0x" })
  const bettor = txn.from
  const { request: finalize } = await publicClient.simulateContract({
    account,
    address: contractAddress,
    abi: abi.abi,
    functionName: 'finalizeBet',
    args: [bettor, choice, multiplier, hash, result]
  })
  const finalizeTxn = await walletClient.writeContract(finalize);
  const data = {
    bettor,
    action,
    amount,
    txnHash: txnHash as string,
    randHash,
    pseudoHash: psuedoHash,
    hash,
    hasWon,
    finalizeTxn
  }
  saveToDb(data)
  const imageUrl = hasWon ? <img src='https://degen-flip-base-hidden.vercel.app/3.png' /> : <img src='https://degen-flip-base-hidden.vercel.app/4.png' />

  return c.res({
    image: imageUrl,
    imageAspectRatio: "1.91:1",
    intents: [
      <Button.Reset>
        Play Again!
      </Button.Reset>,
      <Button.Link href={`${blockExplorer}/tx/${finalizeTxn}`}>
        View on Degen Chain explorer
      </Button.Link>,
      <Button.Link href={`https://warpcast.com/~/compose?text=Flip+a+coin+and+win+upto+5x+%24DEGEN%21&embeds[]=https://degen-flip.vercel.app/api`}>
        Share! (10% bonus)
      </Button.Link>,
    ]
  })
})

app.transaction('/sponsor/:amount', async (c) => {
  const amount = decodeURI(c.req.param('amount'))
  return c.contract({
    abi: abi.abi,
    chainId: `eip155:${chainId}` as any,
    functionName: 'sponsor',
    to: contractAddress,
    value: parseEther(amount)
  })
})

type Bet = {
  bettor: string,
  action: string,
  amount: string,
  txnHash: string,
  randHash: string,
  pseudoHash: string,
  hash: string,
  hasWon: boolean,
  finalizeTxn: string
}

async function saveToDb(data: Bet) {
  try {
    await prisma.bet.create({
      data
    });
  } catch (e) {
    console.log(e)
  }
}

devtools(app, { serveStatic })

export const GET = handle(app)
export const POST = handle(app)

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

const app = new Frog({
  assetsPath: "/",
  basePath: `/api`,
  // Supply a Hub to enable frame verification.
  // hub: neynar({ apiKey: 'NEYNAR_FROG_FM' }),
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
    image: "https://degen-flip-base.vercel.app/1.png",
    imageAspectRatio: "1.91:1",
    intents: [
      <TextInput placeholder="Amount $DEGEN" />,
      <Button value="heads">
        HEAD
      </Button>,
      <Button value="sponsor">
        Sponsor!
      </Button>,
      <Button value="tails">
        TAIL
      </Button>,
    ],
    title: "DEGEN FLIP",
  });
});

app.frame("/select-multipler", async (c) => {
  const { buttonValue, inputText } = c
  if (buttonValue == "sponsor" && inputText) {
    return c.res({
      action: '/',
      image: "https://degen-flip-base.vercel.app/1.png",
      imageAspectRatio: "1.91:1",
      intents: [
        <Button>
          Skip
        </Button>,
        <Button.Transaction target={`/sponsor/${encodeURI(inputText)}`}>
          Send!
        </Button.Transaction>,
      ]
    })
  }
  if (inputText && inputText > "1000") {
    return c.res({
      action: `/`,
      image: "https://degen-flip-base.vercel.app/1.png",
      imageAspectRatio: "1.91:1",
      intents: [
        <Button>
          Cannot fund your bet, please sponsor!
        </Button>
      ]
    })
  }
  return c.res({
    action: `/flip/${buttonValue}/${encodeURI(inputText as string)}`,
    image: "https://degen-flip-base.vercel.app/2.png",
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
    image: "https://degen-flip-base.vercel.app/2.png",
    imageAspectRatio: "1.91:1",
    intents: [
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

  const imageUrl = hasWon ? "https://degen-flip-base.vercel.app/3.png" : "https://degen-flip-base.vercel.app/4.png"

  return c.res({
    action: "/",
    image: imageUrl,
    imageAspectRatio: "1.91:1",
    intents: [
      hasWon && <Button.Link href='https://warpcast.com/~/compose?text=Woohooo%21+Just+doubled+my+%24DEGEN+on+Degen+Flip.+Flip+coin+to+double+your+%24DEGEN+now%21+%2Fdegen-house-casino'>Share! (10% bonus)</Button.Link>,
      <Button>
        Play Again!
      </Button>,
      <Button.Link href={`${blockExplorer}/tx/${finalizeTxn}`}>
        View on Degen Chain explorer
      </Button.Link>
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

devtools(app, { serveStatic })

export const GET = handle(app)
export const POST = handle(app)

import type { Story } from './types';

export const samples: Story[] = [
  {
    version: 1,
    title: 'The Lighthouse That Forgot the Sea',
    description: 'A lantern burns above an empty harbour. Follow a misplaced tide, listen to a sleeping ocean, and decide what a light is for.',
    startId: 'harbour',
    passages: [
      {
        id: 'harbour',
        title: 'Where the water used to be',
        body: 'By morning, the sea has gone. Fishing boats lean on the harbour floor like shoes left outside a door. Far above them, the lighthouse keeps turning its patient circle over miles of silver sand.\n\nYou are the keeper’s apprentice. On the doorstep lies a wet envelope addressed to: Whoever still remembers the sound.',
        ending: false,
        choices: [
          { id: 'letter', text: 'Open the wet envelope.', target: 'letter' },
          { id: 'sand', text: 'Follow the last ribbon of water across the sand.', target: 'bell' },
          { id: 'stairs', text: 'Climb to the lantern room.', target: 'lantern' },
        ],
      },
      {
        id: 'letter',
        title: 'A letter written in salt',
        body: 'The paper holds only a tide mark. When you warm it between your hands, words rise through the fibres:\n\nI was tired of being called empty whenever no ships came home. I have gone somewhere I can hear myself.\n\nInside the envelope is a shell. Its small, steady breathing sounds remarkably like someone trying not to cry.',
        ending: false,
        choices: [
          { id: 'listen', text: 'Carry the shell down to the old harbour bell.', target: 'bell' },
          { id: 'light', text: 'Take the letter to the lantern room.', target: 'lantern' },
        ],
      },
      {
        id: 'bell',
        title: 'The bell below the tide',
        body: 'The harbour bell stands on a reef that has not seen daylight for a hundred years. Its bronze is green as an old apple. A crab in a teacup tells you the bell can call anything home, provided you know its true name.\n\n“What if it doesn’t want to come?” you ask.\n\nThe crab considers this. “Then perhaps you should invite it.”',
        ending: false,
        choices: [
          { id: 'command', text: 'Ring the bell and command the sea to return.', target: 'return' },
          { id: 'invite', text: 'Ring once, then leave room for an answer.', target: 'listening' },
          { id: 'reconsider', text: 'Return to the lighthouse and think.', target: 'lantern' },
        ],
      },
      {
        id: 'lantern',
        title: 'The machinery of remembering',
        body: 'The great lens contains a tiny storm. Each time it turns, you glimpse a different sea: your first swim, the keeper’s last voyage, a winter when everyone shared one fishing boat.\n\nA brass lever reads HOME. Beside it is a window, painted shut for so long that a moth has built a house in the latch. You could make the beam brighter. Or you could let something in.',
        ending: false,
        choices: [
          { id: 'beam', text: 'Pull the lever and send every memory out to sea.', target: 'return' },
          { id: 'window', text: 'Open the window and listen.', target: 'listening' },
          { id: 'walk', text: 'Go down to the exposed reef.', target: 'bell' },
        ],
      },
      {
        id: 'return',
        title: 'A harbour full of home',
        body: 'The horizon rises like someone standing from a chair. Water rushes into the harbour; ropes tighten, boats lift, and every window in the village flashes blue.\n\nFor a moment you hear a thousand remembered voices. Then there is only the ordinary slap of waves against stone.\n\nYou have brought the sea home. That evening, you begin a new keeper’s log. On its first page you write: Ask it how it is tomorrow.',
        ending: true,
        choices: [],
      },
      {
        id: 'listening',
        title: 'A light that listens',
        body: 'You do not shout. In the space you leave, the sea speaks: not in words, but in the hush beneath a wave before it breaks.\n\nIt returns slowly. First a pool for the crabs, then a channel for the boats, then a blue distance no one can own. You turn the lighthouse lens inward for one night, lighting the village instead.\n\nYears later, people will say you saved the harbour. You will remember it differently: you made room for something to come back of its own accord.',
        ending: true,
        choices: [],
      },
    ],
  },
  {
    version: 1,
    title: 'The Last Orchard in the Sky',
    description: 'Above the clouds, an orchard drifts toward its final winter. A seed courier must choose what to carry forward—and what to let fall.',
    startId: 'arrival',
    passages: [
      {
        id: 'arrival',
        title: 'The last landing',
        body: 'Your glider catches on a branch just as the dawn bells begin to ring. Below, clouds roll over the world like wool over sleeping shoulders.\n\nThe last orchard in the sky has seven trees, one gardener, and a basket with your name on it. The gardener hands you a pear bright enough to read by.\n\n“Winter arrives at noon,” she says. “There is room on your glider for one kind of future.”',
        ending: false,
        choices: [
          { id: 'roots', text: 'Ask why the orchard is drifting lower.', target: 'roots' },
          { id: 'fruit', text: 'Examine the luminous pear.', target: 'pear' },
          { id: 'maps', text: 'Look for a place to land below the clouds.', target: 'map' },
        ],
      },
      {
        id: 'roots',
        title: 'What holds a garden up',
        body: 'The trees’ roots knot around a small stone moon. Once, the gardener says, hundreds of orchards flew together, sharing the work of staying aloft. This one has been alone too long.\n\nYou find a release clasp in the rootwork. Opening it would let the orchard descend. Keeping it closed would preserve its wonder, for a little while.',
        ending: false,
        choices: [
          { id: 'release', text: 'Plan a gentle descent for the whole orchard.', target: 'map' },
          { id: 'preserve', text: 'Take a cutting and preserve the flying trees.', target: 'cloud' },
          { id: 'inspect', text: 'Check whether the pear holds another possibility.', target: 'pear' },
        ],
      },
      {
        id: 'pear',
        title: 'A small constellation',
        body: 'Inside the pear are twelve seeds, each with a pinprick of light. Held to your ear, they hum in harmony with the orchard’s branches.\n\nThe gardener brings twelve paper envelopes. “They won’t fly alone,” she warns. “They will need people willing to tend them together.”\n\nThrough a break in the cloud, you see lanterns waking in a distant valley.',
        ending: false,
        choices: [
          { id: 'share', text: 'Carry the seeds to twelve different households.', target: 'seeds' },
          { id: 'keep', text: 'Keep the seeds together in a new cloud nursery.', target: 'cloud' },
          { id: 'ground', text: 'Find a landing place for their parent trees.', target: 'map' },
        ],
      },
      {
        id: 'map',
        title: 'An unfinished map',
        body: 'The gardener’s map ends at the cloud line. You draw the valley beneath it: a river, a disused station, a hillside bare after a fire.\n\nThere is room for the orchard on that hillside, but it will never fly again. There is also time for one glider journey before the first frost. You can carry twelve envelopes, or a single living branch.',
        ending: false,
        choices: [
          { id: 'land', text: 'Unfasten the stone moon and land on the hillside.', target: 'earth' },
          { id: 'deliver', text: 'Take the twelve seed envelopes to the valley.', target: 'seeds' },
          { id: 'branch', text: 'Fly onward with a cutting and the gardener.', target: 'cloud' },
        ],
      },
      {
        id: 'earth',
        title: 'The first grounded spring',
        body: 'You open the clasp a finger’s width at a time. The orchard settles through the cloud, shedding silver leaves, until its roots touch the blackened hillside.\n\nAll winter, neighbours bring blankets for the trunks and buckets for the roots. In spring, the first blossom opens at a child’s eye level.\n\nThe trees no longer carry anyone above the world. Instead, anyone can walk into their shade.',
        ending: true,
        choices: [],
      },
      {
        id: 'seeds',
        title: 'Twelve windows of light',
        body: 'At each door you leave an envelope and explain that one tree is not enough. By winter’s end, twelve strangers have become a circle of gardeners.\n\nTheir seedlings never leave the ground. But when the wind blows, the leaves hum together, and everyone in the valley looks up.\n\nYou keep the empty basket. It reminds you that carrying something safely is not always the same as keeping it.',
        ending: true,
        choices: [],
      },
      {
        id: 'cloud',
        title: 'A smaller sky',
        body: 'You and the gardener build a nursery beneath your glider’s sail. The cutting roots in a thimble of soil; three leaves unfold, each lighter than a promise.\n\nBehind you, the old orchard slips into the clouds. Ahead are weather stations, lonely airships, and people who have forgotten that fruit can grow above the rain.\n\nYou cannot save the orchard you knew. You can keep its strange possibility alive—and this time, you will not ask it to fly alone.',
        ending: true,
        choices: [],
      },
    ],
  },
];

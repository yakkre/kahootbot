const Kahoot     = require("kahoot.js-updated");
const prompt     = require("prompt-sync")();
const randomName = require("random-name");

// 1) Game PIN
const pinInput = prompt("Game PIN: ").trim();
if (!/^\d+$/.test(pinInput)) {
  console.error("❌ PIN must be numeric");
  process.exit(1);
}

// 2) Base nickname
let baseName;
const useRandom = prompt("Use random base name? (yes/no): ")
  .trim()
  .toLowerCase();

if (useRandom === "yes") {
  baseName = randomName.first();
  console.log(`Using random base name: ${baseName}`);
} else if (useRandom === "no") {
  baseName = prompt("Enter base name: ").trim();
  if (!baseName) {
    console.error("❌ You must enter a base name");
    process.exit(1);
  }
} else {
  console.error('❌ Please type "yes" or "no"');
  process.exit(1);
}

// 3) How many bots?
const countInput = prompt("How many bots? (1–100): ").trim();
const botCount   = parseInt(countInput, 10);
if (isNaN(botCount) || botCount < 1 || botCount > 100) {
  console.error("❌ Bot count must be a number between 1 and 100");
  process.exit(1);
}

// 4) Random‐answer toggle
const randomAns =
  prompt("Answer randomly? (yes/no): ").trim().toLowerCase() === "yes";

console.log(`\n🚀 Launching ${botCount} bots into game ${pinInput}…\n`);

// 5) Spawn them, at 1 bot every 100ms (with visibility on what happens)
for (let i = 1; i <= botCount; i++) {
  setTimeout(() => {
    const name   = `${baseName}${i}`;
    const client = new Kahoot();

    console.log(`↪️  joining as "${name}"...`);

    client
      .join(pinInput, name)
      .catch(err => {
        try {
          console.error(`✖ ${name} failed to join: ${err?.description || err?.message || 'no-message'}`);
          console.error(`   raw: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
        } catch {
          console.error(`   raw: ${String(err)}`);
        }
      });

    client.on("Joined", () => {
      console.log(`✅ ${name} joined`);
    });

    // extra signals that explain "why not showing up"
    client.on("NameAccept", () => console.log(`🪪 ${name} name accepted`));
    client.on("NameReject", () => console.log(`⛔ ${name} name rejected (duplicate or nickname rules)`));
    client.on("Kicked", reason => console.log(`🛑 ${name} kicked: ${reason}`));
    client.on("TwoFactorReset", () => console.log(`🔐 ${name} blocked: Two-Step Join enabled`));
    client.on("Locked", () => console.log(`🔒 ${name} blocked: lobby locked`));
    client.on("Error", e => {
      try {
        console.log(`❗ ${name} client error: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`);
      } catch {
        console.log(`❗ ${name} client error: ${String(e)}`);
      }
    });

    // only hook the answer event if randomAns===true
    if (randomAns) {
      client.on("QuestionStart", question => {
        // determine how many choices there are:
        let count = 4; // fallback
        if (Array.isArray(question.quizQuestionAnswers)) {
          // some versions: quizQuestionAnswers[questionIndex] === number of choices
          const possible = question.quizQuestionAnswers[question.questionIndex];
          count = typeof possible === "number" ? possible : question.quizQuestionAnswers.length;
        }
        const pick = Math.floor(Math.random() * count);
        question.answer(pick);
        console.log(`   🤖 ${name} answered choice #${pick}`);
      });
    }

    client.on("Disconnect", reason => {
      console.log(`⚠️  ${name} disconnected: ${reason}`);
    });
  }, (i - 1) * 100); // 100ms spacing between bots
}

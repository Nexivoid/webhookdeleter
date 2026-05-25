const form = document.querySelector("#delete-form");
const input = document.querySelector("#webhook-url");
const silentToggle = document.querySelector("#silent-toggle");
const farewellInput = document.querySelector("#farewell-message");
const button = document.querySelector("#delete-button");
const message = document.querySelector("#message");

const webhookPattern =
  /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/i;

document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function syncFarewellInput() {
  farewellInput.hidden = silentToggle.checked;
}

async function readDiscordError(response, fallback) {
  try {
    const data = await response.json();
    if (data?.message) {
      return data.message;
    }
  } catch {
  }

  return fallback;
}

silentToggle.addEventListener("change", syncFarewellInput);
syncFarewellInput();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const webhookUrl = input.value.trim();
  const shouldDeleteSilently = silentToggle.checked;
  const farewellMessage = farewellInput.value.trim() || "Bye!";

  if (!webhookPattern.test(webhookUrl)) {
    setMessage("That does not look like a Discord webhook URL.", "error");
    input.focus();
    return;
  }

  button.disabled = true;
  button.textContent = shouldDeleteSilently ? "Deleting..." : "Sending...";
  setMessage(
    shouldDeleteSilently ? "Sending delete request..." : "Sending farewell message...",
  );

  try {
    if (!shouldDeleteSilently) {
      const sendResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: farewellMessage }),
      });

      if (!sendResponse.ok) {
        const detail = await readDiscordError(
          sendResponse,
          `Discord returned ${sendResponse.status} while sending.`,
        );
        setMessage(detail, "error");
        return;
      }

      button.textContent = "Deleting...";
      setMessage("Message sent. Deleting webhook...");
    }

    const deleteResponse = await fetch(webhookUrl, { method: "DELETE" });

    if (deleteResponse.ok || deleteResponse.status === 204) {
      input.value = "";
      farewellInput.value = "Bye!";
      setMessage("Webhook deleted.", "success");
      return;
    }

    const detail = await readDiscordError(
      deleteResponse,
      `Discord returned ${deleteResponse.status} while deleting.`,
    );

    setMessage(detail, "error");
  } catch {
    setMessage("Request failed. Check the URL and your connection.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Delete";
  }
});

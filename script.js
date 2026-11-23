/*
  script.js = what the website DOES.
  It does three jobs:
    1. The players: Play / Stop buttons, Loop buttons and the seek bars
       (only one song plays at a time).
    2. The search bar hides arrangements that don't match.
    3. Shows how many arrangements are on screen.
*/

// ---------- STEP 1: grab the things we need from the page ----------
// document.querySelector finds ONE element. querySelectorAll finds ALL that match.
const arrangements = document.querySelectorAll(".arrangement");
const searchInput  = document.querySelector("#search-input");
const searchButton = document.querySelector("#search-button");
const countText    = document.querySelector("#count");
const noResults    = document.querySelector("#no-results");

// A list of every song's player, so we can stop the others when one starts.
const allPlayers = [];


// ---------- HELPER: turn seconds into "minutes:seconds" ----------
// Example: 147 seconds -> "2:27"
function formatTime(seconds) {
  if (isNaN(seconds)) {
    return "0:00";
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  // If secs is 7, show "07" so it reads "2:07", not "2:7".
  return minutes + ":" + String(secs).padStart(2, "0");
}


// ---------- JOB 1: THE PLAYERS ----------
arrangements.forEach(function (box) {
  // The pieces inside THIS box
  const button      = box.querySelector(".play-button");
  const loopButton  = box.querySelector(".loop-button");
  const seek        = box.querySelector(".seek");
  const currentText = box.querySelector(".time-current");
  const totalText   = box.querySelector(".time-total");

  // Each box gets its own invisible music player.
  // preload = "metadata" loads just the song's length, not the whole song.
  const player = new Audio();
  player.preload = "metadata";
  player.src = box.dataset.mp3;   // reads data-mp3="..." from the HTML
  allPlayers.push(player);

  let dragging = false; // true while someone is holding the seek dot

  // Moves the dot and colors the "already played" part of the line.
  function showPosition(seconds) {
    seek.value = seconds;
    currentText.textContent = formatTime(seconds);
    const percent = player.duration ? (seconds / player.duration) * 100 : 0;
    seek.style.setProperty("--progress", percent + "%");
  }

  // Puts this box back to "not playing".
  function resetLook() {
    box.classList.remove("playing");
    button.innerHTML = "&#9658; Play";
  }

  // The song's length has loaded -> show it on the right ("2:27").
  player.addEventListener("loadedmetadata", function () {
    seek.max = player.duration;
    totalText.textContent = formatTime(player.duration);
  });

  // Fires many times a second while playing -> move the dot along.
  player.addEventListener("timeupdate", function () {
    if (!dragging) {
      showPosition(player.currentTime);
    }
  });

  // Playing -> yellow box + "Stop" button.
  player.addEventListener("play", function () {
    box.classList.add("playing");
    button.innerHTML = "&#9632; Stop";
  });

  // Paused or stopped -> back to normal.
  player.addEventListener("pause", resetLook);

  // Song finished -> back to the start.
  // (When Loop is ON, the song never "ends": the browser jumps straight
  //  back to 0:00 and keeps playing, so this part doesn't run.)
  player.addEventListener("ended", function () {
    resetLook();
    player.currentTime = 0;
    showPosition(0);
  });

  // The MP3 file couldn't load (not uploaded yet) -> "No file".
  player.addEventListener("error", function () {
    button.textContent = "No file";
    button.disabled = true;
    loopButton.disabled = true; // nothing to loop either
    seek.disabled = true;
  });

  // PLAY / STOP button
  button.addEventListener("click", function () {
    if (!player.paused) {
      // It's playing -> Stop: pause and go back to the start.
      player.pause();
      player.currentTime = 0;
      showPosition(0);
      return;
    }

    // Stop every OTHER song first, so only one plays at a time.
    allPlayers.forEach(function (other) {
      if (other !== player && !other.paused) {
        other.pause();
        other.currentTime = 0;
      }
    });

    player.play();
  });

  // LOOP button: flips looping ON and OFF.
  // player.loop is built into every browser's audio player:
  //   true  = when the song reaches the end, start again from 0:00
  //   false = stop at the end (normal)
  loopButton.addEventListener("click", function () {
    player.loop = !player.loop; // "!" means "the opposite of", so true becomes false and false becomes true

    // Tell the page whether it's on, so style.css can make the button look pushed in.
    loopButton.setAttribute("aria-pressed", String(player.loop));
  });

  // SEEK BAR
  // "input" = while dragging: only update the time text, don't jump yet.
  seek.addEventListener("input", function () {
    dragging = true;
    showPosition(Number(seek.value));
  });

  // "change" = let go of the dot (or clicked the line): jump to that spot.
  seek.addEventListener("change", function () {
    player.currentTime = Number(seek.value);
    dragging = false;
  });
});


// ---------- JOB 2: THE SEARCH BAR ----------
function runSearch() {
  // What the person typed, in lowercase so "Boss" and "boss" both match.
  const typed = searchInput.value.toLowerCase().trim();
  let shownCount = 0;

  arrangements.forEach(function (box) {
    // Only search the title, game/year, and description
    // (not the button or the times on the seek bar).
    let boxText =
      box.querySelector(".track-title").textContent + " " +
      box.querySelector(".details").textContent;

    // Some boxes have no description (it can be turned off in index.html).
    // Only add it if this box HAS one, otherwise the code would crash.
    const description = box.querySelector(".description");
    if (description !== null) {
      boxText = boxText + " " + description.textContent;
    }

    boxText = boxText.toLowerCase();

    if (boxText.includes(typed)) {
      box.hidden = false; // matches -> show it
      shownCount = shownCount + 1;
    } else {
      box.hidden = true;  // doesn't match -> hide it
    }
  });

  noResults.hidden = shownCount > 0;
  updateCount(shownCount, typed);
}

// Search while typing, or when clicking the Search button.
// "if (searchInput !== null)" = only if the page HAS a search bar right now.
// (It's turned off in index.html for now, so this part is skipped.)
if (searchInput !== null) {
  searchInput.addEventListener("input", runSearch);
  searchButton.addEventListener("click", runSearch);
}


// ---------- JOB 3: THE COUNT ("Showing all 3 arrangements") ----------
function updateCount(shown, typed) {
  const total = arrangements.length;

  // English: "1 arrangement" (no s), but "3 arrangements" (with s).
  let word = "arrangements";
  if (total === 1) {
    word = "arrangement";
  }

  if (typed === "" && total === 1) {
    countText.textContent = "Showing 1 arrangement";              // just one song
  } else if (typed === "") {
    countText.textContent = "Showing all " + total + " " + word;  // e.g. "Showing all 3 arrangements"
  } else {
    countText.textContent = "Showing " + shown + " of " + total + " " + word;
  }
}

// Fill in the count once when the page first loads.
updateCount(arrangements.length, "");

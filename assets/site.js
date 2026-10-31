/* BNB Clean · V2 shared behaviour (no dependencies) */
(function(){
  "use strict";
  var WAITLIST_URL = "https://qoyuuwqljkcnfywxtslb.supabase.co/functions/v1/waitlist";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---- Nav: solid background once the hero is scrolled past ---- */
  var nav = document.getElementById("nav");
  function updateNav(){
    if (nav) nav.classList.toggle("is-solid", window.scrollY > 24);
  }

  /* ---- Mobile burger menu ---- */
  var burger = document.getElementById("navBurger");
  var mobileMenu = document.getElementById("mobileMenu");
  function closeMenu(){
    if (!mobileMenu) return;
    mobileMenu.classList.remove("open");
    mobileMenu.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Open menu");
    nav.classList.remove("is-open");
  }
  function openMenu(){
    mobileMenu.classList.add("open");
    mobileMenu.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Close menu");
    nav.classList.add("is-open");
  }
  if (burger && mobileMenu) {
    burger.addEventListener("click", function(){
      if (burger.getAttribute("aria-expanded") === "true") closeMenu();
      else openMenu();
    });
    mobileMenu.querySelectorAll("a").forEach(function(a){ a.addEventListener("click", closeMenu); });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") { closeMenu(); burger.focus(); }
    });
    window.addEventListener("resize", function(){ if (window.innerWidth >= 1000) closeMenu(); });
  }

  /* ---- WhatsApp: appears after the first screen ---- */
  var waFloat = document.getElementById("waFloat");
  function updateWa(){
    if (waFloat) waFloat.classList.toggle("show", window.scrollY > 450);
  }

  var ticking = false;
  window.addEventListener("scroll", function(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function(){ updateNav(); updateWa(); ticking = false; });
  }, { passive: true });
  updateNav(); updateWa();

  /* ---- Hero video: loaded only after the page (and its text) has rendered ---- */
  var video = document.getElementById("heroVideo");
  var pauseBtn = document.getElementById("heroPause");
  var manualBtn = document.getElementById("heroPlay");
  var userPaused = false;
  var started = false;

  var touchOnly = window.matchMedia("(hover: none)").matches;
  var peekTimer;
  function peek(){
    pauseBtn.classList.add("is-peek");
    clearTimeout(peekTimer);
    peekTimer = setTimeout(function(){ pauseBtn.classList.remove("is-peek"); }, 3000);
  }

  function setPaused(paused){
    pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
    pauseBtn.setAttribute("aria-label", paused ? "Play background video" : "Pause background video");
  }

  function startVideo(manual){
    if (!video || started) return;
    if (reduceMotion.matches && !manual) {
      console.info("Hero video skipped: prefers-reduced-motion");
      manualBtn.hidden = false;
      return;
    }
    started = true;
    manualBtn.hidden = true;
    if (manual) video.classList.add("is-manual");
    var mobile = window.matchMedia("(max-width: 768px)").matches;
    video.poster = mobile ? "media/hero-poster-mobile.jpg" : "media/hero-poster.jpg";
    video.querySelectorAll("source[data-src]").forEach(function(s){
      var media = s.getAttribute("media");
      if (media && !window.matchMedia(media).matches) { s.remove(); return; }
      s.src = s.getAttribute("data-src");
    });
    video.muted = true; // Safari/iOS: autoplay needs the muted property, not only the attribute
    var peeked = false;
    video.addEventListener("playing", function(){
      video.classList.add("is-playing");
      pauseBtn.classList.add("is-visible");
      setPaused(false);
      if (!peeked && touchOnly) { peeked = true; peek(); }
    });
    // Touch screens have no hover: a tap on the hero shows the control again for 3 s
    if (touchOnly) video.closest(".hero").addEventListener("touchstart", peek, { passive: true });
    video.load();
    var p = video.play();
    if (p && p.catch) p.catch(function(){ /* autoplay refused: the poster stays */ });

    pauseBtn.addEventListener("click", function(){
      if (video.paused) { userPaused = false; video.play().catch(function(){}); setPaused(false); }
      else { userPaused = true; video.pause(); setPaused(true); }
    });

    // Save battery: pause while the hero is off screen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) { if (!userPaused) video.play().catch(function(){}); }
          else video.pause();
        });
      }).observe(video);
    }
  }

  if (video) {
    manualBtn.addEventListener("click", function(){ startVideo(true); });
    var kick = function(){
      if ("requestIdleCallback" in window) requestIdleCallback(function(){ startVideo(false); }, { timeout: 1500 });
      else setTimeout(function(){ startVideo(false); }, 200);
    };
    if (document.readyState === "complete") kick();
    else window.addEventListener("load", kick);

    if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", function(e){
      if (e.matches && !video.classList.contains("is-manual")) { video.pause(); pauseBtn.classList.remove("is-visible"); }
    });
  }

  /* ---- Premium: example weekly statements, computed with the real hourly rates ---- */
  var statementBody = document.getElementById("statementBody");
  if (statementBody) {
    var RATE = { Solo: 50, Duo: 90 }; // A$ per hour, as in the app
    var STATEMENTS = [
      [["Mon", "Airbnb Turnover", "Solo", 105], ["Wed", "Airbnb Turnover", "Duo", 150], ["Sat", "Airbnb Turnover", "Solo", 105]],
      [["Tue", "Deep Clean", "Solo", 180], ["Thu", "Airbnb Turnover", "Solo", 135], ["Sun", "Airbnb Turnover", "Duo", 120]],
      [["Mon", "Airbnb Turnover", "Solo", 105], ["Tue", "Airbnb Turnover", "Solo", 105], ["Fri", "Airbnb Turnover", "Duo", 180]]
    ];
    // Hourly rate × duration, rounded to the nearest 5 dollars (as in the app)
    var price = function(team, minutes){ return Math.round(RATE[team] * minutes / 60 / 5) * 5; };
    var dur = function(min){ var h = Math.floor(min / 60), m = min % 60; return h + "h" + (m ? String(m).padStart(2, "0") : ""); };
    var renderStatement = function(i){
      var total = 0;
      var rows = STATEMENTS[i].map(function(job, n){
        var amount = price(job[2], job[3]);
        total += amount;
        return "<li><div>" + job[1] + "<small>" + job[0] + " · " + job[2] + " " + dur(job[3]) + " · Property " + (n + 1) +
          "</small></div><strong>A$" + amount + "</strong></li>";
      }).join("");
      statementBody.innerHTML = '<ul class="statement-rows">' + rows + '</ul><div class="statement-total"><span>Total</span><strong>A$' + total + "</strong></div>";
    };
    renderStatement(0);
    var current = 0;
    setInterval(function(){
      if (reduceMotion.matches) { if (current !== 0) { current = 0; renderStatement(0); } return; } // reduced motion: statement 1, fixed
      if (document.hidden) return;
      statementBody.classList.add("is-fading");
      setTimeout(function(){
        current = (current + 1) % STATEMENTS.length;
        renderStatement(current);
        statementBody.classList.remove("is-fading");
      }, 400);
    }, 6000);
  }

  /* ---- Waitlist forms (Edge Function "waitlist", body { email, ville }) ---- */
  function isValidEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function setError(input, msg){
    var el = document.getElementById(input.id + "-error");
    if (el) el.textContent = msg || "";
    if (msg) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  document.querySelectorAll("form[data-waitlist]").forEach(function(form){
    var emailInput = form.querySelector("input[type=email]");
    var townInput = form.querySelector("input[data-town]");
    var fixedTown = form.getAttribute("data-fixed-town");
    var status = form.querySelector(".form-status");
    var btn = form.querySelector("button[type=submit]");

    [emailInput, townInput].forEach(function(i){
      if (i) i.addEventListener("input", function(){ setError(i, ""); });
    });

    form.addEventListener("submit", async function(e){
      e.preventDefault();
      if (btn.disabled) return; // anti double-click

      var email = emailInput.value.trim();
      var town = townInput ? townInput.value.trim() : fixedTown;
      var firstInvalid = null;

      if (!isValidEmail(email)) { setError(emailInput, "Please enter a valid email address."); firstInvalid = emailInput; }
      else setError(emailInput, "");
      if (townInput) {
        if (!town) { setError(townInput, "Please tell us your town or suburb."); firstInvalid = firstInvalid || townInput; }
        else setError(townInput, "");
      }
      if (firstInvalid) { status.textContent = ""; firstInvalid.focus(); return; }

      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = "Sending…";
      status.textContent = "";

      try {
        var res = await fetch(WAITLIST_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, ville: town })
        });
        var data = await res.json();
        if (res.ok && data.success) {
          status.textContent = fixedTown
            ? form.getAttribute("data-success")
            : "Thanks! You're on the list. We'll email you as soon as we cover " + town + ".";
          form.reset();
          btn.textContent = "Done";
          return; // stays disabled: request sent
        }
        throw new Error(data.error || "unknown");
      } catch (err) {
        setError(emailInput, "Something went wrong. Please try again or email us at admin@bnbclean.au.");
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  });
})();

/* BNB Clean · V2 shared behaviour (no dependencies) */
(function(){
  "use strict";
  // Supabase public (anon / publishable) key: designed to ship in client code, access is enforced server side
  var SUPABASE_URL = "https://qoyuuwqljkcnfywxtslb.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_I_YaQOEIYfgUXjYalR5meg_taoPifC3";
  var WAITLIST_URL = SUPABASE_URL + "/functions/v1/waitlist";
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

  /* ---- Price estimator (RPC estimer_prix_public). No price is computed or stored here. ---- */
  var est = document.getElementById("estimator");
  var fallback = document.getElementById("priceFallback");
  if (est && fallback) (function(){
    var RPC_URL = SUPABASE_URL + "/rest/v1/rpc/estimer_prix_public";
    var TIMEOUT_MS = 4000, DEBOUNCE_MS = 150;
    var range = document.getElementById("est-duration");
    var durOut = document.getElementById("est-duration-out");
    var minOut = document.getElementById("est-min");
    var maxOut = document.getElementById("est-max");
    var priceOut = document.getElementById("est-price");
    var metaOut = document.getElementById("est-meta");
    var result = est.querySelector(".est-result");
    var counts = {};
    var timer = null, controller = null, seq = 0, dead = false;

    // 1.75 -> "1h45", 3.5 -> "3h30", 1 -> "1h"
    function fmt(h){
      var m = Math.round(h * 60), hh = Math.floor(m / 60), mm = m % 60;
      return hh + "h" + (mm ? String(mm).padStart(2, "0") : "");
    }
    function spoken(h){
      var m = Math.round(h * 60), hh = Math.floor(m / 60), mm = m % 60;
      return hh + (hh === 1 ? " hour" : " hours") + (mm ? " " + mm + " minutes" : "");
    }
    function team(){ return est.querySelector("input[name=team]:checked").value; }
    function paintRange(){
      var min = +range.min, max = +range.max, v = +range.value;
      range.style.setProperty("--fill", (max > min ? (v - min) / (max - min) * 100 : 0) + "%");
      durOut.textContent = fmt(v);
      range.setAttribute("aria-valuetext", spoken(v));
    }

    // Steppers (bedrooms, bathrooms)
    est.querySelectorAll("[data-stepper]").forEach(function(st){
      var key = st.getAttribute("data-stepper"), min = +st.dataset.min, max = +st.dataset.max, zero = st.dataset.zero;
      var out = st.querySelector("output"), dec = st.querySelector("[data-step='-1']"), inc = st.querySelector("[data-step='1']");
      function render(){
        var v = counts[key];
        out.textContent = (v === 0 && zero) ? zero : String(v);
        dec.disabled = v <= min; inc.disabled = v >= max;
      }
      counts[key] = +st.dataset.value;
      render();
      st.addEventListener("click", function(e){
        var b = e.target.closest("button[data-step]");
        if (!b || b.disabled) return;
        counts[key] = Math.min(max, Math.max(min, counts[key] + +b.dataset.step));
        render();
        if (b.disabled) (b === dec ? inc : dec).focus(); // keep keyboard focus inside the stepper
        schedule(false);
      });
    });

    function showFallback(){
      dead = true;
      clearTimeout(timer);
      if (controller) controller.abort();
      est.hidden = true;
      fallback.hidden = false;
    }

    function schedule(withDuration){
      if (dead) return;
      clearTimeout(timer);
      result.setAttribute("aria-busy", "true");
      timer = setTimeout(function(){ call(withDuration); }, DEBOUNCE_MS);
    }

    function call(withDuration){
      if (controller) controller.abort(); // cancel any previous request
      var ctrl = controller = new AbortController();
      var id = ++seq, timedOut = false;
      var t = setTimeout(function(){ timedOut = true; ctrl.abort(); }, TIMEOUT_MS);
      var body = {
        p_service: est.querySelector("input[name=service]:checked").value,
        p_chambres: counts.chambres,
        p_sdb: counts.sdb,
        p_duo: team() === "duo"
      };
      if (withDuration) body.p_duree = +range.value;

      fetch(RPC_URL, {
        method: "POST",
        headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal
      }).then(function(res){
        return res.json().catch(function(){ return {}; }).then(function(data){ return { res: res, data: data }; });
      }).then(function(r){
        clearTimeout(t);
        if (id !== seq) return; // a newer request is on its way
        if (r.res.ok && typeof r.data.prix === "number") return render(r.data, !withDuration);
        // Duration out of the new bounds (e.g. slider moved while the size was changing): recalibrate
        if (r.res.status === 400 && r.data.hint === "duree_invalide" && withDuration) return call(false);
        showFallback();
      }).catch(function(){
        clearTimeout(t);
        if (id !== seq && !timedOut) return; // aborted because superseded
        showFallback(); // network error or > 4 s
      });
    }

    function render(d, calibrate){
      if (calibrate) {
        range.min = d.duree_min;
        range.max = d.duree_max;
        range.value = d.duree_estimee;
        minOut.textContent = fmt(d.duree_min);
        maxOut.textContent = fmt(d.duree_max);
        range.disabled = false;
      }
      paintRange();
      priceOut.textContent = "A$" + d.prix;
      metaOut.textContent = "for " + fmt(d.duree) + " · " + (team() === "duo" ? "Duo" : "Solo");
      result.setAttribute("aria-busy", "false");
    }

    est.addEventListener("change", function(e){
      if (e.target.name === "service" || e.target.name === "team") schedule(false);
    });
    range.addEventListener("input", function(){ paintRange(); schedule(true); });
    est.addEventListener("submit", function(e){ e.preventDefault(); });

    paintRange();
    call(false); // first price on arrival: Airbnb Turnover, 1 bedroom, 1 bathroom, Solo
  })();

  /* ---- Premium request (Edge Function "premium-request") ---- */
  var pToggle = document.getElementById("premiumToggle");
  var pPanel = document.getElementById("premiumPanel");
  var pForm = document.getElementById("premiumForm");
  if (pToggle && pPanel && pForm) (function(){
    var closeTimer;
    function setOpen(open){
      clearTimeout(closeTimer);
      pToggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        pPanel.hidden = false;
        void pPanel.offsetHeight; // start the 200 ms transition from the closed state
        pPanel.classList.add("is-open");
      } else {
        pPanel.classList.remove("is-open");
        closeTimer = setTimeout(function(){ pPanel.hidden = true; }, reduceMotion.matches ? 0 : 220);
      }
    }
    pToggle.addEventListener("click", function(){ setOpen(pToggle.getAttribute("aria-expanded") !== "true"); });

    var email = document.getElementById("pf-email");
    var status = pForm.querySelector(".pf-status");
    var btn = pForm.querySelector("button[type=submit]");
    var done = document.getElementById("premiumDone");
    email.addEventListener("input", function(){ setError(email, ""); });

    pForm.addEventListener("submit", async function(e){
      e.preventDefault();
      if (btn.disabled) return;
      var value = email.value.trim();
      status.textContent = "";
      if (!isValidEmail(value)) { setError(email, "Please enter a valid email address."); email.focus(); return; }
      setError(email, "");

      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = "Sending…";
      var res = null, data = {};
      try {
        res = await fetch(SUPABASE_URL + "/functions/v1/premium-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prenom: document.getElementById("pf-name").value.trim(),
            email: value,
            nb_logements: document.getElementById("pf-count").value,
            source: "site"
          })
        });
        data = await res.json().catch(function(){ return {}; });
      } catch (err) { res = null; }

      if (res && res.ok && data.success) {
        pForm.hidden = true;
        done.hidden = false;
        done.focus();
        return;
      }
      if (res && res.status === 400 && data.error === "invalid_email") {
        setError(email, "Please enter a valid email address.");
        email.focus();
      } else if (res && res.status === 429) {
        status.textContent = "You've already sent a request today. We'll be in touch.";
        btn.textContent = label;
        return; // stays disabled: a request is already on file
      } else {
        status.innerHTML = 'Something went wrong. Email us at <span class="copy">admin@bnbclean.au</span>';
      }
      btn.disabled = false;
      btn.textContent = label;
    });
  })();

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

(function () {
  function initAirBuilder() {
    const root = document.getElementById("air-builder");
    if (!root || root.dataset.airBuilderInitialized === "true") return;
    root.dataset.airBuilderInitialized = "true";

    let FITMENTS = [];
    let currentFitment = null;
    let skuDetails = {};
    let preloadPromise = null;
    let rendered = {
      management: false,
      tank: false,
      addon: false
    };

    let GLOBAL_MANAGEMENT_SKUS = ["27680", "27685", "27480", "27485"];
    let GLOBAL_TANK_SKUS = ["27801", "27802", "27803", "27804", "27805", "27806", "27807", "27808", "27762", "27764", "27767", "27769"];
    let GLOBAL_ADDON_SKUS = ["27705", "27703", "27750", "27751"];

    const yearEl = document.getElementById("air-year");
    const makeEl = document.getElementById("air-make");
    const modelEl = document.getElementById("air-model");
    const driveEl = document.getElementById("air-drive");
    const fitmentResultEl = document.getElementById("air-fitment-result");
    const builderAreaEl = document.getElementById("air-builder-area");
    const progressEl = document.getElementById("air-progress");
    const summaryShellEl = document.getElementById("air-summary-shell");

    const slideSuspensionEl = document.getElementById("air-slide-suspension");
    const slideManagementEl = document.getElementById("air-slide-management");
    const slideTankEl = document.getElementById("air-slide-tank");
    const slideAddonsEl = document.getElementById("air-slide-addons");
    const slideReviewEl = document.getElementById("air-slide-review");

    const slideErrorSuspensionEl = document.getElementById("air-slide-error-suspension");
    const slideErrorManagementEl = document.getElementById("air-slide-error-management");
    const slideErrorTankEl = document.getElementById("air-slide-error-tank");

    const kitGridEl = document.getElementById("air-kit-grid");
    const managementGridEl = document.getElementById("air-management-grid");
    const tankGridEl = document.getElementById("air-tank-grid");
    const addonGridEl = document.getElementById("air-addon-grid");

    const suspensionSummaryEl = document.getElementById("air-suspension-summary");
    const managementSummaryEl = document.getElementById("air-management-summary");
    const tankSummaryEl = document.getElementById("air-tank-summary");
    const addonSummaryEl = document.getElementById("air-addon-summary");

    const reviewVehicleEl = document.getElementById("air-review-vehicle");
    const reviewSuspensionEl = document.getElementById("air-review-suspension");
    const reviewManagementEl = document.getElementById("air-review-management");
    const reviewTankEl = document.getElementById("air-review-tank");
    const reviewAddonsEl = document.getElementById("air-review-addons");

    const sideVehicleEl = document.getElementById("air-side-vehicle");
    const sideSuspensionEl = document.getElementById("air-side-suspension");
    const sideManagementEl = document.getElementById("air-side-management");
    const sideTankEl = document.getElementById("air-side-tank");
    const sideAddonsEl = document.getElementById("air-side-addons");
    const sideTotalEl = document.getElementById("air-side-total");

    const mobileVehicleEl = document.getElementById("air-mobile-vehicle");
    const mobileSuspensionEl = document.getElementById("air-mobile-suspension");
    const mobileManagementEl = document.getElementById("air-mobile-management");
    const mobileTankEl = document.getElementById("air-mobile-tank");
    const mobileAddonsEl = document.getElementById("air-mobile-addons");
    const mobileTotalEl = document.getElementById("air-mobile-total");
    const cartPriceEl = document.getElementById("air-cart-price");

    const slides = {
      suspension: slideSuspensionEl,
      management: slideManagementEl,
      tank: slideTankEl,
      addons: slideAddonsEl,
      review: slideReviewEl
    };

    const state = {
      frontSelected: false,
      rearSelected: false,
      noSuspension: false,
      managementSku: "",
      noManagement: false,
      tankSku: "",
      noTank: false,
      addons: []
    };

    function uniq(arr) {
      return [...new Set(arr)];
    }

    function moneyFormat(cents) {
      return typeof cents === "number" ? "$" + (cents / 100).toFixed(2) : "$0.00";
    }

    function getManagementSkus() {
      return currentFitment?.managementSkus?.length ? currentFitment.managementSkus : GLOBAL_MANAGEMENT_SKUS;
    }

    function getTankSkus() {
      return currentFitment?.tankSkus?.length ? currentFitment.tankSkus : GLOBAL_TANK_SKUS;
    }

    function getAddonSkus() {
      return currentFitment?.addonSkus?.length ? currentFitment.addonSkus : GLOBAL_ADDON_SKUS;
    }

    function clearInlineErrors() {
      [slideErrorSuspensionEl, slideErrorManagementEl, slideErrorTankEl].forEach((el) => {
        if (!el) return;
        el.style.display = "none";
        el.textContent = "";
      });
    }

    function showInlineError(el, msg) {
      if (!el) return;
      el.textContent = msg;
      el.style.display = "block";
    }

    function resetMake() {
      makeEl.innerHTML = '<option value="">Select Make</option>';
      makeEl.disabled = true;
    }

    function resetModel() {
      modelEl.innerHTML = '<option value="">Select Model</option>';
      modelEl.disabled = true;
    }

    function resetDrive() {
      driveEl.innerHTML = '<option value="">Select Drivetrain</option>';
      driveEl.disabled = true;
    }

    function buildVehicleLabel() {
      return [yearEl.value, makeEl.value, modelEl.value, driveEl.value].filter(Boolean).join(" ");
    }

    function selectedSuspensionTitles() {
      if (state.noSuspension || !currentFitment) return [];
      const arr = [];
      if (state.frontSelected && skuDetails[currentFitment.frontSku]) arr.push(skuDetails[currentFitment.frontSku].title);
      if (state.rearSelected && skuDetails[currentFitment.rearSku]) arr.push(skuDetails[currentFitment.rearSku].title);
      return arr;
    }

    function getEstimatedTotal() {
      let total = 0;

      if (!state.noSuspension && currentFitment) {
        if (state.frontSelected && skuDetails[currentFitment.frontSku]?.priceCents) total += skuDetails[currentFitment.frontSku].priceCents;
        if (state.rearSelected && skuDetails[currentFitment.rearSku]?.priceCents) total += skuDetails[currentFitment.rearSku].priceCents;
      }

      if (!state.noManagement && state.managementSku && skuDetails[state.managementSku]?.priceCents) {
        total += skuDetails[state.managementSku].priceCents;
      }

      if (!state.noTank && state.tankSku && skuDetails[state.tankSku]?.priceCents) {
        total += skuDetails[state.tankSku].priceCents;
      }

      state.addons.forEach((sku) => {
        if (skuDetails[sku]?.priceCents) total += skuDetails[sku].priceCents;
      });

      return total;
    }

    function updateSummary() {
      const vehicleText = buildVehicleLabel() || "Not selected";

      let suspensionText = "Not selected";
      if (state.noSuspension) {
        suspensionText = "No Suspension";
      } else {
        const titles = selectedSuspensionTitles();
        suspensionText = titles.length ? titles.join(" + ") : "Not selected";
      }

      let managementText = "Not selected";
      let tankText = "Not selected";

      if (state.noManagement) {
        managementText = "No Management";
      } else {
        managementText = state.managementSku && skuDetails[state.managementSku]
          ? skuDetails[state.managementSku].title
          : "Not selected";
      }

      tankText = state.noTank
        ? "No Tank + Compressor"
        : (state.tankSku && skuDetails[state.tankSku]
            ? skuDetails[state.tankSku].title
            : "Not selected");

      const addonsText = state.addons.length
        ? state.addons.map((sku) => skuDetails[sku]?.title || sku).join(", ")
        : "None";

      const totalText = moneyFormat(getEstimatedTotal());

      if (sideVehicleEl) sideVehicleEl.textContent = vehicleText;
      if (sideSuspensionEl) sideSuspensionEl.innerHTML = suspensionText;
      if (sideManagementEl) sideManagementEl.textContent = managementText;
      if (sideTankEl) sideTankEl.textContent = tankText;
      if (sideAddonsEl) sideAddonsEl.innerHTML = addonsText;
      if (sideTotalEl) sideTotalEl.textContent = totalText;

      if (mobileVehicleEl) mobileVehicleEl.textContent = vehicleText;
      if (mobileSuspensionEl) mobileSuspensionEl.textContent = suspensionText.replace(/<br>/g, ", ");
      if (mobileManagementEl) mobileManagementEl.textContent = managementText;
      if (mobileTankEl) mobileTankEl.textContent = tankText;
      if (mobileAddonsEl) mobileAddonsEl.textContent = addonsText.replace(/<br>/g, ", ");
      if (mobileTotalEl) mobileTotalEl.textContent = totalText;

      if (cartPriceEl) cartPriceEl.textContent = totalText;
    }

    function resetBuilderState() {
      currentFitment = null;
      skuDetails = {};
      preloadPromise = null;
      rendered = { management: false, tank: false, addon: false };

      state.frontSelected = false;
      state.rearSelected = false;
      state.noSuspension = false;
      state.managementSku = "";
      state.noManagement = false;
      state.tankSku = "";
      state.noTank = false;
      state.addons = [];

      if (fitmentResultEl) fitmentResultEl.innerHTML = "";
      if (builderAreaEl) builderAreaEl.style.display = "none";
      if (progressEl) progressEl.style.display = "none";
      if (summaryShellEl) summaryShellEl.style.display = "none";

      clearInlineErrors();

      Object.values(slides).forEach((slide) => {
        if (slide) slide.classList.remove("is-active");
      });

      if (kitGridEl) kitGridEl.innerHTML = "";
      if (managementGridEl) managementGridEl.innerHTML = "";
      if (tankGridEl) tankGridEl.innerHTML = "";
      if (addonGridEl) addonGridEl.innerHTML = "";

      if (suspensionSummaryEl) suspensionSummaryEl.innerHTML = "";
      if (managementSummaryEl) managementSummaryEl.innerHTML = "";
      if (tankSummaryEl) tankSummaryEl.innerHTML = "";
      if (addonSummaryEl) addonSummaryEl.innerHTML = "";

      if (reviewVehicleEl) reviewVehicleEl.textContent = "—";
      if (reviewSuspensionEl) reviewSuspensionEl.textContent = "—";
      if (reviewManagementEl) reviewManagementEl.textContent = "—";
      if (reviewTankEl) reviewTankEl.textContent = "—";
      if (reviewAddonsEl) reviewAddonsEl.textContent = "—";

      updateSummary();
    }

    function buildYears() {
      yearEl.innerHTML = '<option value="">Select Year</option>';
      const years = [];
      FITMENTS.forEach((f) => {
        for (let y = f.yearStart; y <= f.yearEnd; y++) years.push(y);
      });
      uniq(years).sort((a, b) => b - a).forEach((year) => {
        yearEl.innerHTML += '<option value="' + year + '">' + year + "</option>";
      });
    }

    function buildProgress(currentStep) {
      const order = ["suspension", "management", "tank", "addons"];
      const currentIndex = order.indexOf(currentStep);
      progressEl.querySelectorAll(".ab-step").forEach((stepEl) => {
        const stepName = stepEl.getAttribute("data-step");
        const stepIndex = order.indexOf(stepName);
        stepEl.classList.remove("is-current", "is-complete");
        if (stepIndex < currentIndex) stepEl.classList.add("is-complete");
        if (stepIndex === currentIndex) stepEl.classList.add("is-current");
      });
    }

    function scrollToActiveSlideTop(name) {
      const slide = slides[name];
      if (!slide) return;

      const isMobile = window.innerWidth <= 768;
      if (!isMobile) return;

      requestAnimationFrame(() => {
        const rect = slide.getBoundingClientRect();
        const absoluteTop = window.pageYOffset + rect.top;
        const offset = 16;

        window.scrollTo({
          top: Math.max(absoluteTop - offset, 0),
          behavior: "smooth"
        });
      });
    }

    function showSlide(name) {
      Object.values(slides).forEach((slide) => {
        if (slide) slide.classList.remove("is-active");
      });

      if (slides[name]) slides[name].classList.add("is-active");

      buildProgress(name === "review" ? "addons" : name);
      clearInlineErrors();
      scrollToActiveSlideTop(name);
    }

    function buildProductCard(product, type) {
      const imageHtml = product.image
        ? '<img src="' + product.image + '" alt="' + (product.title || product.sku) + '" class="ab-img">'
        : '<div style="font-size:13px; color:#999;">No image</div>';

      const priceHtml = typeof product.priceCents === "number"
        ? '<div class="ab-price">' + moneyFormat(product.priceCents) + "</div>"
        : '<div class="ab-price">&nbsp;</div>';

      return `
        <div class="ab-card" data-type="${type}" data-sku="${product.sku}">
          <div class="ab-img-wrap">${imageHtml}</div>
          <div class="ab-meta">Part # ${product.sku}</div>
          <div class="ab-title">${product.title || product.sku}</div>
          <div class="ab-note">&nbsp;</div>
          ${priceHtml}
        </div>
      `;
    }

    function buildOptionCard(title, note, type) {
      return `
        <div class="ab-card" data-type="${type}" data-sku="">
          <div class="ab-img-wrap">
            <div style="font-size:14px; font-weight:800; color:#111;">None</div>
          </div>
          <div class="ab-meta">&nbsp;</div>
          <div class="ab-title">${title}</div>
          <div class="ab-note">${note}</div>
          <div class="ab-price">&nbsp;</div>
        </div>
      `;
    }

    async function enrichProducts(products) {
      const enriched = await Promise.all(
        products.map(async function (product) {
          if (skuDetails[product.sku]?.variantId) return skuDetails[product.sku];

          const fallback = {
            ...product,
            title: product.title || product.sku,
            image: product.image || "",
            variantId: product.variantId || "",
            priceCents: typeof product.priceCents === "number" ? product.priceCents : null
          };

          if (!product.handle) return fallback;

          try {
            const res = await fetch("/products/" + product.handle + ".js");
            if (!res.ok) return fallback;

            const shopifyProduct = await res.json();
            const matchedVariant =
              (shopifyProduct.variants || []).find((variant) => variant.sku === product.sku) ||
              (shopifyProduct.variants || []).find((variant) => variant.available) ||
              (shopifyProduct.variants || [])[0] ||
              null;

            let image = fallback.image || "";
            if (!image && matchedVariant?.featured_image?.src) image = matchedVariant.featured_image.src;
            if (!image && shopifyProduct.featured_image) image = shopifyProduct.featured_image;
            if (!image && Array.isArray(shopifyProduct.images) && shopifyProduct.images[0]) image = shopifyProduct.images[0];

            return {
              ...fallback,
              title: shopifyProduct.title || fallback.title,
              image,
              variantId: matchedVariant ? matchedVariant.id : fallback.variantId,
              priceCents: matchedVariant ? Number(matchedVariant.price) : fallback.priceCents
            };
          } catch (e) {
            return fallback;
          }
        })
      );

      enriched.forEach((product) => {
        skuDetails[product.sku] = product;
      });

      return enriched;
    }

    async function preloadAllProducts() {
      const allSkus = uniq([
        currentFitment?.frontSku,
        currentFitment?.rearSku,
        ...getManagementSkus(),
        ...getTankSkus(),
        ...getAddonSkus()
      ].filter(Boolean));

      if (!allSkus.length) return;

      const res = await fetch("/apps/air-builder/products?skus=" + encodeURIComponent(allSkus.join(",")));
      const rawText = await res.text();

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        throw new Error("Products route did not return valid JSON");
      }

      if (!res.ok) {
        throw new Error(data?.error || "Products request failed");
      }

      await enrichProducts(data.products || []);
    }

    function renderProductsFromCache(skus, containerEl, type) {
      containerEl.innerHTML = skus
        .filter(Boolean)
        .map((sku) => buildProductCard(skuDetails[sku] || { sku, title: sku, image: "", priceCents: null }, type))
        .join("");
    }

    function setCenteredGridIfNeeded(containerEl) {
      const count = containerEl.querySelectorAll(".ab-card").length;
      containerEl.classList.toggle("ab-grid--3", count === 3);
    }

    function updateSuspensionSummary() {
      if (!suspensionSummaryEl) {
        updateSummary();
        return;
      }

      if (state.noSuspension) {
        suspensionSummaryEl.innerHTML = "Selected: No Suspension";
        updateSummary();
        return;
      }

      const chosen = [];
      if (state.frontSelected) chosen.push("Front Suspension");
      if (state.rearSelected) chosen.push("Rear Suspension");

      suspensionSummaryEl.innerHTML = chosen.length
        ? "Selected: " + chosen.join(" + ")
        : "Select front, rear, both, or no suspension.";

      updateSummary();
    }

    function updateManagementSummary() {
      if (!managementSummaryEl) {
        updateSummary();
        return;
      }

      if (state.noManagement) {
        managementSummaryEl.innerHTML = "Selected: No Management";
        updateSummary();
        return;
      }

      managementSummaryEl.innerHTML = state.managementSku
        ? "Selected: " + (skuDetails[state.managementSku]?.title || state.managementSku)
        : "Select a management option or choose no management.";

      updateSummary();
    }

    function updateTankSummary() {
      if (!tankSummaryEl) {
        updateSummary();
        return;
      }

      if (state.noTank) {
        tankSummaryEl.innerHTML = "Selected: No Tank + Compressor";
        updateSummary();
        return;
      }

      tankSummaryEl.innerHTML = state.tankSku
        ? "Selected: " + (skuDetails[state.tankSku]?.title || state.tankSku)
        : "Select a tank + compressor setup or choose no tank + compressor.";

      updateSummary();
    }

    function updateAddonSummary() {
      if (!addonSummaryEl) {
        updateSummary();
        return;
      }

      addonSummaryEl.innerHTML = state.addons.length
        ? "Selected Add-Ons: " + state.addons.map((sku) => skuDetails[sku]?.title || sku).join(", ")
        : "No add-ons selected.";

      updateSummary();
    }

    function getVariantIdFromSku(sku) {
      return skuDetails[sku] && skuDetails[sku].variantId ? skuDetails[sku].variantId : null;
    }

    function buildReview() {
  const vehicleText = buildVehicleLabel() || "—";

  const suspensionItems = [];
  if (state.noSuspension) {
    suspensionItems.push("No Suspension");
  } else if (currentFitment) {
    if (state.frontSelected && currentFitment.frontSku) {
      suspensionItems.push(skuDetails[currentFitment.frontSku]?.title || currentFitment.frontSku);
    }
    if (state.rearSelected && currentFitment.rearSku) {
      suspensionItems.push(skuDetails[currentFitment.rearSku]?.title || currentFitment.rearSku);
    }
  }

  const suspensionText = suspensionItems.length ? suspensionItems.join("<br>") : "None";

  const managementText = state.noManagement
    ? "No Management"
    : (state.managementSku
        ? (skuDetails[state.managementSku]?.title || state.managementSku)
        : "None");

  const tankText = state.noTank
    ? "No Tank + Compressor"
    : (state.tankSku
        ? (skuDetails[state.tankSku]?.title || state.tankSku)
        : "None");

  const addonsText = state.addons.length
    ? state.addons.map((sku) => skuDetails[sku]?.title || sku).join("<br>")
    : "No Add-Ons";

  if (reviewVehicleEl) reviewVehicleEl.innerHTML = vehicleText;
  if (reviewSuspensionEl) reviewSuspensionEl.innerHTML = suspensionText;
  if (reviewManagementEl) reviewManagementEl.innerHTML = managementText;
  if (reviewTankEl) reviewTankEl.innerHTML = tankText;
  if (reviewAddonsEl) reviewAddonsEl.innerHTML = addonsText;

  if (mobileVehicleEl) mobileVehicleEl.textContent = vehicleText;
  if (mobileSuspensionEl) mobileSuspensionEl.textContent = suspensionItems.length ? suspensionItems.join(", ") : "None";
  if (mobileManagementEl) mobileManagementEl.textContent = managementText;
  if (mobileTankEl) mobileTankEl.textContent = tankText;
  if (mobileAddonsEl) mobileAddonsEl.textContent = state.addons.length
    ? state.addons.map((sku) => skuDetails[sku]?.title || sku).join(", ")
    : "No Add-Ons";
  if (mobileTotalEl) mobileTotalEl.textContent = moneyFormat(getEstimatedTotal());

  updateSummary();
}


    function bindSuspensionCards() {
      const kitCards = kitGridEl.querySelectorAll('.ab-card[data-type="kit"]');
      const noSuspensionCard = kitGridEl.querySelector('.ab-card[data-type="no-suspension"]');

      kitCards.forEach((card) => {
        card.onclick = function () {
          const sku = this.dataset.sku || "";
          if (!sku || !currentFitment) return;

          if (sku === currentFitment.frontSku) {
            state.frontSelected = !state.frontSelected;
            this.classList.toggle("is-selected", state.frontSelected);
          }

          if (sku === currentFitment.rearSku) {
            state.rearSelected = !state.rearSelected;
            this.classList.toggle("is-selected", state.rearSelected);
          }

          if (state.frontSelected || state.rearSelected) {
            state.noSuspension = false;
            if (noSuspensionCard) noSuspensionCard.classList.remove("is-selected");
          }

          updateSuspensionSummary();
          clearInlineErrors();
        };
      });

      if (noSuspensionCard) {
        noSuspensionCard.onclick = function () {
          state.noSuspension = true;
          state.frontSelected = false;
          state.rearSelected = false;
          kitCards.forEach((card) => card.classList.remove("is-selected"));
          this.classList.add("is-selected");
          updateSuspensionSummary();
          clearInlineErrors();
        };
      }
    }

    function bindManagementCards() {
      const managementCards = managementGridEl.querySelectorAll('.ab-card[data-type="management"]');
      const noManagementCard = managementGridEl.querySelector('.ab-card[data-type="no-management"]');

      managementCards.forEach((card) => {
        card.onclick = function () {
          managementCards.forEach((c) => c.classList.remove("is-selected"));
          if (noManagementCard) noManagementCard.classList.remove("is-selected");
          this.classList.add("is-selected");
          state.managementSku = this.dataset.sku || "";
          state.noManagement = false;
          updateManagementSummary();
          clearInlineErrors();
        };
      });

      if (noManagementCard) {
        noManagementCard.onclick = function () {
          managementCards.forEach((c) => c.classList.remove("is-selected"));
          this.classList.add("is-selected");
          state.managementSku = "";
          state.noManagement = true;
          updateManagementSummary();
          clearInlineErrors();
        };
      }
    }

    function bindTankCards() {
      const tankCards = tankGridEl.querySelectorAll('.ab-card[data-type="tank"]');
      const noTankCard = tankGridEl.querySelector('.ab-card[data-type="no-tank"]');

      tankCards.forEach((card) => {
        card.onclick = function () {
          tankCards.forEach((c) => c.classList.remove("is-selected"));
          if (noTankCard) noTankCard.classList.remove("is-selected");
          this.classList.add("is-selected");
          state.tankSku = this.dataset.sku || "";
          state.noTank = false;
          updateTankSummary();
          clearInlineErrors();
        };
      });

      if (noTankCard) {
        noTankCard.onclick = function () {
          tankCards.forEach((c) => c.classList.remove("is-selected"));
          this.classList.add("is-selected");
          state.tankSku = "";
          state.noTank = true;
          updateTankSummary();
          clearInlineErrors();
        };
      }
    }

    function bindAddonCards() {
      const addonCards = addonGridEl.querySelectorAll('.ab-card[data-type="addon"]');
      addonCards.forEach((card) => {
        card.onclick = function () {
          const sku = this.dataset.sku || "";
          if (!sku) return;

          if (state.addons.includes(sku)) {
            state.addons = state.addons.filter((item) => item !== sku);
            this.classList.remove("is-selected");
          } else {
            state.addons.push(sku);
            this.classList.add("is-selected");
          }

          updateAddonSummary();
        };
      });
    }

    async function appendBuilderOrderNote() {
      return;
    }

    function buildCartItems() {
      const items = [];

      if (!state.noSuspension && currentFitment) {
        if (state.frontSelected) {
          const frontVariantId = getVariantIdFromSku(currentFitment.frontSku);
          if (frontVariantId) items.push({ id: frontVariantId, quantity: 1 });
        }
        if (state.rearSelected) {
          const rearVariantId = getVariantIdFromSku(currentFitment.rearSku);
          if (rearVariantId) items.push({ id: rearVariantId, quantity: 1 });
        }
      }

      if (!state.noManagement && state.managementSku) {
        const managementVariantId = getVariantIdFromSku(state.managementSku);
        if (managementVariantId) items.push({ id: managementVariantId, quantity: 1 });
      }

      if (!state.noTank && state.tankSku) {
        const tankVariantId = getVariantIdFromSku(state.tankSku);
        if (tankVariantId) items.push({ id: tankVariantId, quantity: 1 });
      }

      state.addons.forEach((sku) => {
        const addonVariantId = getVariantIdFromSku(sku);
        if (addonVariantId) items.push({ id: addonVariantId, quantity: 1 });
      });

      const vehicleLabel = buildVehicleLabel();
      const suspensionLabel = state.noSuspension
        ? "No Suspension"
        : [state.frontSelected ? "Front" : "", state.rearSelected ? "Rear" : ""].filter(Boolean).join(" + ");
      const managementLabel = state.noManagement
        ? "No Management"
        : (skuDetails[state.managementSku]?.title || state.managementSku || "None");
      const tankLabel = state.noTank
        ? "No Tank + Compressor"
        : (skuDetails[state.tankSku]?.title || state.tankSku || "None");
      const addonLabel = state.addons.length
        ? state.addons.map((sku) => skuDetails[sku]?.title || sku).join(", ")
        : "None";

      return items.map((item) => ({
        ...item,
        properties: {
          "_builder": "Air Ride Kit Builder",
          "Vehicle": vehicleLabel,
          "Suspension": suspensionLabel || "None",
          "Management": managementLabel,
          "Tank + Compressor": tankLabel,
          "Add-Ons": addonLabel
        }
      }));
    }

    function previousStepsAllowed(step) {
      if (!currentFitment) return false;
      const currentStepName = Object.keys(slides).find((key) => slides[key].classList.contains("is-active")) || "suspension";
      const order = ["suspension", "management", "tank", "addons"];
      return order.indexOf(step) <= order.indexOf(currentStepName);
    }

    progressEl.querySelectorAll(".ab-step").forEach((stepEl) => {
      stepEl.onclick = function () {
        const step = this.getAttribute("data-step");
        if (!step || !currentFitment) return;
        if (!previousStepsAllowed(step)) return;
        showSlide(step);
      };
    });

    async function loadFitments() {
      try {
        const res = await fetch("/apps/air-builder/fitments?mode=list");
        const json = await res.json();

        FITMENTS = Array.isArray(json.fitments) ? json.fitments : [];

        if (json.settings?.managementSkus?.length) GLOBAL_MANAGEMENT_SKUS = json.settings.managementSkus;
        if (json.settings?.tankSkus?.length) GLOBAL_TANK_SKUS = json.settings.tankSkus;
        if (json.settings?.addonSkus?.length) GLOBAL_ADDON_SKUS = json.settings.addonSkus;

        if (json.error) console.error("Fitments route error:", json.error);
        if (!FITMENTS.length) fitmentResultEl.innerHTML = "No fitments loaded.";
      } catch (e) {
        FITMENTS = [];
        fitmentResultEl.innerHTML = "Unable to load fitment data.";
        console.error("Fitment load error:", e);
      }
    }

    async function ensurePreloaded() {
      if (!preloadPromise) preloadPromise = preloadAllProducts();
      return preloadPromise;
    }

    function renderManagementStep() {
      if (rendered.management) return;
      renderProductsFromCache(getManagementSkus(), managementGridEl, "management");
      managementGridEl.insertAdjacentHTML("beforeend", buildOptionCard("No Management", "Continue without a management system.", "no-management"));
      setCenteredGridIfNeeded(managementGridEl);
      bindManagementCards();
      updateManagementSummary();
      rendered.management = true;
    }

    function renderTankStep() {
      if (rendered.tank) return;
      renderProductsFromCache(getTankSkus(), tankGridEl, "tank");
      tankGridEl.insertAdjacentHTML("beforeend", buildOptionCard("No Tank + Compressor", "Continue without a tank and compressor.", "no-tank"));
      setCenteredGridIfNeeded(tankGridEl);
      bindTankCards();
      updateTankSummary();
      rendered.tank = true;
    }

    function renderAddonStep() {
      if (rendered.addon) return;
      renderProductsFromCache(getAddonSkus(), addonGridEl, "addon");
      setCenteredGridIfNeeded(addonGridEl);
      bindAddonCards();
      updateAddonSummary();
      rendered.addon = true;
    }

    (async function initData() {
      await loadFitments();
      buildYears();
      updateSummary();
    })();

    yearEl.onchange = function () {
      resetMake();
      resetModel();
      resetDrive();
      resetBuilderState();

      const selectedYear = Number(yearEl.value);
      if (!selectedYear) return;

      const makes = uniq(
        FITMENTS
          .filter((f) => selectedYear >= f.yearStart && selectedYear <= f.yearEnd)
          .map((f) => f.make)
      ).sort();

      makes.forEach((make) => {
        makeEl.innerHTML += '<option value="' + make + '">' + make + "</option>";
      });

      makeEl.disabled = false;
      updateSummary();
    };

    makeEl.onchange = function () {
      resetModel();
      resetDrive();
      resetBuilderState();

      const selectedYear = Number(yearEl.value);
      const selectedMake = makeEl.value;
      if (!selectedYear || !selectedMake) return;

      const models = uniq(
        FITMENTS
          .filter((f) => selectedYear >= f.yearStart && selectedYear <= f.yearEnd && f.make === selectedMake)
          .map((f) => f.model)
      ).sort();

      models.forEach((model) => {
        modelEl.innerHTML += '<option value="' + model + '">' + model + "</option>";
      });

      modelEl.disabled = false;
      updateSummary();
    };

    modelEl.onchange = function () {
      resetDrive();
      resetBuilderState();

      const selectedYear = Number(yearEl.value);
      const selectedMake = makeEl.value;
      const selectedModel = modelEl.value;
      if (!selectedYear || !selectedMake || !selectedModel) return;

      const drives = uniq(
        FITMENTS
          .filter((f) =>
            selectedYear >= f.yearStart &&
            selectedYear <= f.yearEnd &&
            f.make === selectedMake &&
            f.model === selectedModel
          )
          .map((f) => f.drive)
      ).sort();

      drives.forEach((drive) => {
        driveEl.innerHTML += '<option value="' + drive + '">' + drive + "</option>";
      });

      driveEl.disabled = false;
      updateSummary();
    };

    driveEl.onchange = function () {
      resetBuilderState();
      updateSummary();
    };

    document.getElementById("air-check-fitment").onclick = async function () {
      try {
        const year = yearEl.value;
        const make = makeEl.value;
        const model = modelEl.value;
        const drivetrain = driveEl.value;

        resetBuilderState();

        if (!year || !make || !model || !drivetrain) {
          fitmentResultEl.innerHTML = "Please select year, make, model, and drivetrain.";
          return;
        }

        const btn = this;
        const oldText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = "Loading kit...";
        fitmentResultEl.innerHTML = "";

        try {
          const fitmentRes = await fetch(
            "/apps/air-builder/fitments?year=" +
              encodeURIComponent(year) +
              "&make=" +
              encodeURIComponent(make) +
              "&model=" +
              encodeURIComponent(model) +
              "&drivetrain=" +
              encodeURIComponent(drivetrain)
          );

          const fitmentRaw = await fitmentRes.text();
          let fitmentData;
          try {
            fitmentData = JSON.parse(fitmentRaw);
          } catch (e) {
            throw new Error("Fitments route did not return valid JSON");
          }

          if (!fitmentRes.ok) {
            throw new Error(fitmentData?.error || "Fitment request failed");
          }

          if (!fitmentData.fitment) {
            fitmentResultEl.innerHTML = "No fitment found.";
            return;
          }

          currentFitment = fitmentData.fitment;

          const suspensionSkus = [currentFitment.frontSku, currentFitment.rearSku].filter(Boolean);
          if (!suspensionSkus.length) {
            throw new Error("Fitment found, but no suspension SKUs are attached.");
          }

          preloadPromise = ensurePreloaded();
          await preloadPromise;

          renderProductsFromCache(suspensionSkus, kitGridEl, "kit");
          kitGridEl.insertAdjacentHTML("beforeend", buildOptionCard("No Suspension", "Skip front and rear suspension.", "no-suspension"));
          setCenteredGridIfNeeded(kitGridEl);
          bindSuspensionCards();
          updateSuspensionSummary();

          builderAreaEl.style.display = "block";
          progressEl.style.display = "grid";
          summaryShellEl.style.display = "block";
          fitmentResultEl.innerHTML = "";
          showSlide("suspension");
        } finally {
          btn.disabled = false;
          btn.innerHTML = oldText;
        }
      } catch (error) {
        console.error("Build My Kit error:", error);
        fitmentResultEl.innerHTML = "There was a problem loading this kit: " + (error?.message || "Unknown error");
      }
    };

    document.getElementById("air-to-management").onclick = async function () {
      if (!state.noSuspension && !state.frontSelected && !state.rearSelected) {
        showInlineError(slideErrorSuspensionEl, "Select front, rear, both, or click No Suspension to continue.");
        return;
      }

      try {
        await ensurePreloaded();
        renderManagementStep();
        showSlide("management");
      } catch (error) {
        console.error("Management step error:", error);
        fitmentResultEl.innerHTML = "There was a problem loading management options.";
      }
    };

    document.getElementById("air-back-to-suspension").onclick = function () {
      showSlide("suspension");
    };

    document.getElementById("air-to-tank").onclick = async function () {
      if (!state.noManagement && !state.managementSku) {
        showInlineError(slideErrorManagementEl, "Select a management system or click No Management to continue.");
        return;
      }

      try {
        await ensurePreloaded();
        renderTankStep();
        showSlide("tank");
      } catch (error) {
        console.error("Tank step error:", error);
        fitmentResultEl.innerHTML = "There was a problem loading tank options.";
      }
    };

    document.getElementById("air-back-to-management").onclick = function () {
      showSlide("management");
    };

    document.getElementById("air-to-addons").onclick = async function () {
      if (!state.noTank && !state.tankSku) {
        showInlineError(slideErrorTankEl, "Select a tank + compressor setup or click No Tank + Compressor to continue.");
        return;
      }

      try {
        await ensurePreloaded();
        renderAddonStep();
        showSlide("addons");
      } catch (error) {
        console.error("Add-ons step error:", error);
        fitmentResultEl.innerHTML = "There was a problem loading add-ons.";
      }
    };

    document.getElementById("air-back-to-tank").onclick = function () {
      showSlide("tank");
    };

    document.getElementById("air-to-review").onclick = function () {
  try {
    buildReview();
    showSlide("review");
  } catch (error) {
    console.error("Review step error:", error);
    fitmentResultEl.innerHTML = "There was a problem loading the review step.";
  }
};

    document.getElementById("air-back-to-addons").onclick = function () {
      showSlide("addons");
    };

    document.getElementById("air-add-to-cart").onclick = async function () {
      if (!currentFitment) return;

      const items = buildCartItems();
      if (!items.length) return;

      const button = this;
      button.disabled = true;
      button.innerHTML = 'Adding to Cart... <span class="ab-cart-price">' + moneyFormat(getEstimatedTotal()) + "</span>";

      try {
        const response = await fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items })
        });

        if (!response.ok) throw new Error("Cart add failed");

        await appendBuilderOrderNote();
        window.location.href = "/cart";
      } catch (e) {
        fitmentResultEl.innerHTML = "There was a problem adding the build to cart.";
      } finally {
        button.disabled = false;
        button.innerHTML = 'Add Build to Cart <span id="air-cart-price" class="ab-cart-price">' + moneyFormat(getEstimatedTotal()) + "</span>";
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAirBuilder);
  } else {
    initAirBuilder();
  }

document.addEventListener("DOMContentLoaded", function () {
  initAirBuilder();
});
  
})();
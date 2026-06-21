(() => {
  const DEFAULT_CANVAS_WIDTH = 1280;
  let zoomState = null;

  function isMobileZoomTarget() {
    return window.matchMedia("(pointer: coarse) and (max-width: 900px)").matches;
  }

  function getShell() {
    return document.querySelector(".page-shell");
  }

  function getCanvasWidth(shell, options) {
    const configuredWidth = Number(options.canvasWidth || 0);
    return Math.max(configuredWidth || DEFAULT_CANVAS_WIDTH, shell.scrollWidth, window.innerWidth);
  }

  function updateSpacer() {
    if (!zoomState) {
      return;
    }

    const { shell, spacer, options } = zoomState;
    const scale = zoomState.scale;
    const canvasWidth = getCanvasWidth(shell, options);
    const canvasHeight = Math.max(Number(options.minHeight || 0), shell.scrollHeight, window.innerHeight);

    shell.style.setProperty("--station13-mobile-canvas-width", `${canvasWidth}px`);
    document.body.style.setProperty("--station13-mobile-canvas-width", `${canvasWidth}px`);
    spacer.style.width = `${canvasWidth * scale}px`;
    spacer.style.height = `${canvasHeight * scale}px`;
  }

  function applyZoom(nextScale, anchor = null) {
    if (!zoomState) {
      return;
    }

    const { viewport, shell, options } = zoomState;
    const previousScale = zoomState.scale;
    const minScale = Number(options.minScale || 0.1);
    const maxScale = Number(options.maxScale || 4);
    const scale = Math.min(maxScale, Math.max(minScale, nextScale));

    zoomState.scale = scale;
    shell.style.setProperty("--station13-mobile-scale", scale);
    updateSpacer();

    if (!anchor || previousScale === scale) {
      return;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const anchorX = anchor.clientX - viewportRect.left;
    const anchorY = anchor.clientY - viewportRect.top;
    const contentX = (viewport.scrollLeft + anchorX) / previousScale;
    const contentY = (viewport.scrollTop + anchorY) / previousScale;
    viewport.scrollLeft = (contentX * scale) - anchorX;
    viewport.scrollTop = (contentY * scale) - anchorY;
  }

  function applyInitialViewportPosition() {
    if (!zoomState) {
      return;
    }

    const { viewport, options } = zoomState;
    const left = Number(options.initialScrollLeft || 0);
    const top = Number(options.initialScrollTop || 0);

    window.scrollTo(0, 0);
    viewport.scrollLeft = left;
    viewport.scrollTop = top;
  }

  function lockInitialView() {
    if (!zoomState) {
      return;
    }

    applyZoom(zoomState.scale);
    applyInitialViewportPosition();
  }

  function setup(options = {}) {
    if (!isMobileZoomTarget()) {
      return null;
    }

    const shell = getShell();
    if (!shell) {
      return null;
    }

    if (zoomState) {
      updateSpacer();
      return zoomState;
    }

    if (shell.dataset.station13MobileZoomReady === "true") {
      return zoomState;
    }

    shell.dataset.station13MobileZoomReady = "true";
    document.body.classList.add("station13-mobile-zoomed");

    const viewport = document.createElement("div");
    viewport.className = "station13-mobile-zoom-viewport";
    const spacer = document.createElement("div");
    spacer.className = "station13-mobile-zoom-spacer";

    shell.parentNode.insertBefore(viewport, shell);
    viewport.appendChild(spacer);
    spacer.appendChild(shell);

    const canvasWidth = getCanvasWidth(shell, options);
    const initialFitWidth = Number(options.initialFitWidth || canvasWidth);
    const initialScale = options.initialScale
      ? Number(options.initialScale)
      : Math.min(Number(options.initialMaxScale || 0.5), Math.max(Number(options.initialMinScale || 0.16), window.innerWidth / initialFitWidth));

    let refreshFrame = 0;
    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(refreshFrame);
      refreshFrame = window.requestAnimationFrame(updateSpacer);
    });

    zoomState = {
      viewport,
      spacer,
      shell,
      options,
      scale: initialScale,
      startDistance: 0,
      startScale: initialScale,
      observer
    };

    applyZoom(initialScale);
    applyInitialViewportPosition();
    observer.observe(shell, {
      childList: true,
      subtree: true
    });

    window.requestAnimationFrame(lockInitialView);
    window.setTimeout(lockInitialView, 150);
    window.setTimeout(lockInitialView, 600);

    viewport.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 2) {
        return;
      }

      const [first, second] = event.touches;
      zoomState.startDistance = Math.hypot(
        second.clientX - first.clientX,
        second.clientY - first.clientY
      );
      zoomState.startScale = zoomState.scale;
    }, { passive: true });

    viewport.addEventListener("touchmove", (event) => {
      if (event.touches.length !== 2 || !zoomState.startDistance) {
        return;
      }

      event.preventDefault();
      const [first, second] = event.touches;
      const distance = Math.hypot(
        second.clientX - first.clientX,
        second.clientY - first.clientY
      );
      const midpoint = {
        clientX: (first.clientX + second.clientX) / 2,
        clientY: (first.clientY + second.clientY) / 2
      };
      applyZoom(zoomState.startScale * (distance / zoomState.startDistance), midpoint);
    }, { passive: false });

    viewport.addEventListener("wheel", (event) => {
      if (!event.ctrlKey) {
        return;
      }

      event.preventDefault();
      const zoomFactor = event.deltaY < 0 ? 1.08 : 0.92;
      applyZoom(zoomState.scale * zoomFactor, event);
    }, { passive: false });

    window.addEventListener("resize", () => {
      if (isMobileZoomTarget()) {
        updateSpacer();
      }
    });

    return zoomState;
  }

  window.station13MobileZoom = {
    setup,
    refresh: updateSpacer,
    getScale: () => zoomState?.scale || 1,
    getShell: () => zoomState?.shell || null,
    getViewport: () => zoomState?.viewport || null,
    isActive: () => Boolean(zoomState)
  };

  function init() {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    const isBoard = document.body.classList.contains("board-page");
    setup({
      canvasWidth: isBoard ? 2380 : 1280,
      initialFitWidth: isBoard ? 2380 : 1280,
      initialScale: isBoard ? 0.34 : undefined,
      initialScrollLeft: 0,
      initialScrollTop: 0,
      minHeight: isBoard ? 1080 : 900,
      initialMaxScale: isBoard ? 0.34 : 0.45,
      initialMinScale: isBoard ? 0.14 : 0.18,
      minScale: 0.1,
      maxScale: 4
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

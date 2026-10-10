import * as THREE from "three";
import { RoomEnvironment } from "./vendor/jsm/environments/RoomEnvironment.js";

const canvas = document.querySelector("#webgl");
const root = document.documentElement;
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const initialReduce = root.classList.contains("reduce");

function fail() {
  document.body.classList.add("no-webgl");
  document.body.classList.remove("webgl-on");
}

if (!canvas) {
  fail();
} else {
  try { boot(); } catch (error) { fail(); }
}

function boot() {
  let renderer;
  try {
    canvas.setAttribute("aria-hidden", "true");
    canvas.setAttribute("tabindex", "-1");
    canvas.style.pointerEvents = "none";
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "low-power"
    });
  } catch (err) {
    fail();
    return;
  }
  if (!renderer.getContext()) {
    fail();
    return;
  }

  let mobile = window.matchMedia("(max-width: 760px)").matches;
  const pixelCap = () => mobile ? 1 : 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelCap()));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x050910, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050910, 0.028);
  const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 40);
  camera.position.set(mobile ? 0.15 : -0.35, mobile ? 1.15 : 0.18, mobile ? 6.2 : 5.15);

  const bulb = new THREE.Group();
  bulb.position.set(mobile ? 0.85 : 1.2, mobile ? 1.55 : 0.38, 0);
  bulb.scale.setScalar(mobile ? 0.48 : 0.98);
  scene.add(bulb);

  const profile = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const y = -1.18 + u * 2.24;
    let r;
    if (u < 0.16) {
      const n = u / 0.16;
      r = 0.2 + 0.025 * Math.sin(n * Math.PI);
    } else {
      const b = (u - 0.16) / 0.84;
      const belly = Math.sin(Math.pow(b, 0.72) * Math.PI);
      r = belly * (0.62 + 0.2 * Math.pow(1 - b, 1.15));
    }
    if (i === 0 || i === steps) r = 0;
    profile.push(new THREE.Vector2(r, y));
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  const glass = new THREE.Mesh(
    new THREE.LatheGeometry(profile, mobile ? 40 : 64),
    new THREE.MeshPhysicalMaterial({
      color: 0xeef3f8,
      metalness: 0,
      roughness: 0.04,
      transmission: 1,
      thickness: 0.45,
      ior: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 0.85,
      attenuationColor: new THREE.Color(0xfff1d2),
      attenuationDistance: 1.4
    })
  );
  glass.geometry.computeVertexNormals();
  bulb.add(glass);

  const coil = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 14;
    const y = -0.22 + (i / 64) * 0.7;
    coil.push(new THREE.Vector3(Math.cos(a) * 0.11, y, Math.sin(a) * 0.11));
  }
  const filament = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 80, 0.022, 6, false),
    new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false })
  );
  bulb.add(filament);
  const supports = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.85, 8),
    new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.8, roughness: 0.3 })
  );
  supports.position.y = 0.02;
  bulb.add(supports);

  const screwMat = new THREE.MeshStandardMaterial({ color: 0xb7c0c8, metalness: 0.95, roughness: 0.32 });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.16, 24), screwMat);
  neck.position.y = -1.22;
  bulb.add(neck);
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.42, 28), screwMat);
  screw.position.y = -1.48;
  bulb.add(screw);
  for (let i = 0; i < 4; i++) {
    const thread = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.02, 8, 24), screwMat);
    thread.rotation.x = Math.PI / 2;
    thread.position.y = -1.34 - i * 0.09;
    bulb.add(thread);
  }
  const contact = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x6e767e, metalness: 0.7, roughness: 0.4 })
  );
  contact.scale.y = 0.55;
  contact.position.y = -1.74;
  bulb.add(contact);

  const lamp = new THREE.PointLight(0xffc14d, 0, 12, 2);
  bulb.add(lamp);
  const ambient = new THREE.AmbientLight(0x9eb6dd, 0);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xd5e4ff, 0);
  key.position.set(-3, 4, 5);
  scene.add(key);

  // Steady warm light: no bloom, particles, flicker or camera animation.
  filament.material.color.setRGB(1.4, 0.65, 0.2);
  lamp.intensity = 1.5;
  ambient.intensity = 0.4;
  key.intensity = 0.8;
  bulb.rotation.set(0, 0.2, -0.04);
  const slot = document.querySelector(".bulb-slot");
  let frameId = 0;
  let disposed = false;
  let contextLost = false;
  let slotVisible = true;
  const removers = [];
  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    removers.push(() => target.removeEventListener(type, handler, options));
  }
  function render() {
    frameId = 0;
    if (disposed || contextLost || document.hidden) return;
    if (mobile && !slotVisible) { renderer.clear(); return; }
    if (mobile && slot) {
      const rect = slot.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const point = new THREE.Vector3(
          ((rect.left + rect.width * 0.68) / window.innerWidth) * 2 - 1,
          -((rect.top + rect.height * 0.28) / window.innerHeight) * 2 + 1, 0.5
        ).unproject(camera);
        const direction = point.sub(camera.position);
        const distance = -camera.position.z / direction.z;
        bulb.position.set(camera.position.x + direction.x * distance,
          camera.position.y + direction.y * distance, 0);
      }
    }
    renderer.render(scene, camera);
  }
  function requestRender() {
    if (!disposed && !contextLost && !frameId && !document.hidden) {
      frameId = requestAnimationFrame(render);
    }
  }
  function resize() {
    mobile = window.matchMedia("(max-width: 760px)").matches;
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelCap()));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.position.set(mobile ? 0 : -0.25, mobile ? 1.15 : 0.18, mobile ? 6.2 : 5.15);
    camera.lookAt(mobile ? 0.35 : 0.2, mobile ? 1.2 : 0.08, 0);
    camera.updateProjectionMatrix();
    bulb.position.set(mobile ? 0.85 : 1.2, mobile ? 1.55 : 0.38, 0);
    bulb.scale.setScalar(mobile ? (slot ? 0.2 : 0.48) : 0.98);
    requestRender();
  }
  listen(window, "resize", resize, { passive: true });
  listen(window, "scroll", () => { if (mobile && slot) requestRender(); }, { passive: true });
  listen(document, "visibilitychange", requestRender);
  listen(canvas, "webglcontextlost", event => {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(frameId);
    frameId = 0;
    fail();
  });
  listen(canvas, "webglcontextrestored", () => {
    contextLost = false;
    document.body.classList.remove("no-webgl");
    document.body.classList.add("webgl-on");
    resize();
  });
  const observer = slot && "IntersectionObserver" in window
    ? new IntersectionObserver(([entry]) => {
      slotVisible = entry.isIntersecting;
      requestRender();
    }) : null;
  observer?.observe(slot);
  const sizeObserver = slot && "ResizeObserver" in window
    ? new ResizeObserver(requestRender) : null;
  sizeObserver?.observe(slot);
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameId);
    removers.forEach(remove => remove());
    observer?.disconnect();
    sizeObserver?.disconnect();
    const geometries = new Set();
    const materials = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) (Array.isArray(object.material) ? object.material : [object.material])
        .forEach(material => materials.add(material));
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    environment.dispose();
    renderer.dispose();
  }
  listen(window, "pagehide", event => { if (!event.persisted) dispose(); });
  listen(window, "pageshow", requestRender);
  resize();
  document.body.classList.remove("no-webgl");
  document.body.classList.add("webgl-on");
}

// Keep all content visible; remove scroll reveals and pointer tilt.
root.classList.remove("js");
document.querySelectorAll(".reveal").forEach(element => element.classList.add("in"));
function syncMotionPreference() {
  root.classList.toggle("reduce", initialReduce || motionPreference.matches);
}
syncMotionPreference();
motionPreference.addEventListener("change", syncMotionPreference);

// Scroll feedback does not depend on WebGL.
const bar = document.querySelector(".progress");
if (bar) {
  bar.setAttribute("aria-hidden", "true");
  let pending = false;
  function measure() {
    pending = false;
    const maximum = root.scrollHeight - window.innerHeight;
    const progress = maximum > 0 ? Math.max(0, Math.min(1, window.scrollY / maximum)) : 0;
    bar.style.transform = `scaleX(${progress})`;
  }
  function scheduleMeasure() {
    if (!pending) { pending = true; requestAnimationFrame(measure); }
  }
  window.addEventListener("scroll", scheduleMeasure, { passive: true });
  window.addEventListener("resize", scheduleMeasure, { passive: true });
  window.addEventListener("load", scheduleMeasure, { once: true });
  measure();
}

const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("#nav");
if (toggle && nav) {
  if (toggle instanceof HTMLButtonElement) toggle.type = "button";
  toggle.setAttribute("aria-controls", nav.id);
  if (!toggle.textContent.trim() && !toggle.hasAttribute("aria-label")) {
    toggle.setAttribute("aria-label", "Navigation öffnen oder schließen");
  }
  // Match this breakpoint to the actual stylesheet when integrating.
  const mobileNav = window.matchMedia("(max-width: 760px)");
  function setOpen(open, restoreFocus = false) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    nav.inert = mobileNav.matches && !open;
    if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  nav.addEventListener("click", event => {
    const link = event.target instanceof Element ? event.target.closest("a") : null;
    if (!link) return;
    setOpen(false);
    if (link.hash && link.origin === location.origin && link.pathname === location.pathname) {
      let destination;
      try { destination = document.getElementById(decodeURIComponent(link.hash.slice(1))); }
      catch { return; }
      if (destination) {
        const temporary = !destination.hasAttribute("tabindex");
        if (temporary) destination.setAttribute("tabindex", "-1");
        destination.focus({ preventScroll: true });
        if (temporary) destination.addEventListener("blur", () => destination.removeAttribute("tabindex"), { once: true });
      }
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) setOpen(false, true);
  });
  document.addEventListener("click", event => {
    if (nav.classList.contains("is-open") && !nav.contains(event.target) && !toggle.contains(event.target)) {
      setOpen(false, nav.contains(document.activeElement));
    }
  });
  mobileNav.addEventListener("change", () => setOpen(false, mobileNav.matches && nav.contains(document.activeElement)));
  setOpen(false);
}

// Existing demo details retained; these are not independently verified.
const mapBtn = document.querySelector("#map-load");
if (mapBtn) {
  if (mapBtn instanceof HTMLButtonElement) mapBtn.type = "button";
  mapBtn.addEventListener("click", () => {
    const hold = document.querySelector("#map-hold");
    if (!hold || hold.querySelector("iframe")) return;
    const frame = document.createElement("iframe");
    frame.title = "Karte: Münchener Straße 47, 91054 Erlangen";
    frame.loading = "lazy";
    frame.referrerPolicy = "no-referrer";
    frame.src = "https://maps.google.com/maps?q=M%C3%BCnchener+Str.+47,+91054+Erlangen&hl=de&z=16&output=embed";
    hold.replaceChildren(frame);
  });
}

const form = document.querySelector("#kontakt-form");
if (form instanceof HTMLFormElement) {
  let status = document.querySelector("#form-status");
  if (!status) {
    status = document.createElement("p");
    status.id = "form-status";
    form.append(status);
  }
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  const field = name => {
    const control = form.elements.namedItem(name);
    return control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement ? control : null;
  };
  const nameField = field("name");
  const phoneField = field("telefon");
  const emailField = field("email");
  const messageField = field("nachricht");
  if (nameField) { nameField.required = true; nameField.autocomplete = "name"; }
  if (messageField) messageField.required = true;
  if (phoneField instanceof HTMLInputElement) { phoneField.type = "tel"; phoneField.autocomplete = "tel"; phoneField.required = false; }
  if (emailField instanceof HTMLInputElement) { emailField.type = "email"; emailField.autocomplete = "email"; emailField.required = false; }
  const controls = [nameField, phoneField, emailField, messageField].filter(Boolean);
  controls.forEach(control => {
    const descriptions = new Set((control.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
    descriptions.add(status.id);
    control.setAttribute("aria-describedby", [...descriptions].join(" "));
    control.addEventListener("input", () => {
      controls.forEach(item => { item.setCustomValidity(""); item.removeAttribute("aria-invalid"); });
      status.textContent = "";
    });
  });
  form.addEventListener("invalid", event => {
    event.target.setAttribute("aria-invalid", "true");
    status.textContent = "Bitte prüfe die markierten Felder.";
  }, true);
  form.addEventListener("submit", event => {
    event.preventDefault();
    controls.forEach(control => { control.setCustomValidity(""); control.removeAttribute("aria-invalid"); });
    if (!nameField || !messageField || (!emailField && !phoneField)) {
      status.textContent = "Das Demo-Formular ist unvollständig. Bitte nutze den vorhandenen Kontaktlink.";
      return;
    }
    const name = nameField.value.trim();
    const phone = phoneField?.value.trim() || "";
    const email = emailField?.value.trim() || "";
    const message = messageField.value.trim();
    if (emailField) emailField.value = email;
    if (!name) nameField.setCustomValidity("Bitte deinen Namen eingeben.");
    if (!message) messageField.setCustomValidity("Bitte eine Nachricht eingeben.");
    if (!email && !phone) (emailField || phoneField).setCustomValidity("Bitte E-Mail oder Telefonnummer für eine Rückmeldung angeben.");
    if (phone && (!/^[+0-9()\s./-]+$/.test(phone) || phone.replace(/\D/g, "").length < 6 || phone.replace(/\D/g, "").length > 15)) {
      phoneField.setCustomValidity("Bitte eine gültige Telefonnummer mit 6 bis 15 Ziffern eingeben.");
    }
    if (!form.reportValidity()) {
      status.textContent = "Bitte prüfe die markierten Felder.";
      return;
    }
    const body = ["Anfrage über den Demo-Entwurf", "", "Name: " + name, "Telefon: " + (phone || "–"), "E-Mail: " + (email || "–"), "", message].join("\n");
    const url = "mailto:elektro-mueller-gmbh@t-online.de?subject=" + encodeURIComponent("Anfrage von " + name.replace(/[\r\n]/g, " ")) + "&body=" + encodeURIComponent(body);
    status.textContent = "Die Anfrage wird an dein E-Mail-Programm übergeben. Sie wurde noch nicht versendet. Falls sich kein Programm öffnet, nutze den Kontaktlink und kopiere deine Nachricht.";
    window.location.href = url;
  });
}

document.querySelectorAll("[data-year]").forEach(element => {
  element.textContent = String(new Date().getFullYear());
});

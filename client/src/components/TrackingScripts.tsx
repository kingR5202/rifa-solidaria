import { useEffect, useState } from "react";

interface TrackingSettings {
  meta_pixel_id?: string;
  meta_access_token?: string;
  meta_events?: string[];
  meta_domain_verification?: string;
  utmify_token?: string;
  clarity_id?: string;
}

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

// Generate unique event ID for deduplication between Pixel and CAPI
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// Get fbp cookie
function getFbp(): string {
  const match = document.cookie.match(/_fbp=([^;]+)/);
  return match ? match[1] : "";
}

// Get fbc from URL or cookie
function getFbc(): string {
  const match = document.cookie.match(/_fbc=([^;]+)/);
  if (match) return match[1];
  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get("fbclid");
  if (fbclid) return `fb.1.${Date.now()}.${fbclid}`;
  return "";
}

// Send event to server-side CAPI with same event_id for deduplication
function sendCapiEvent(
  eventName: string,
  eventId: string,
  userData: Record<string, string> = {},
  customData: Record<string, any> = {}
) {
  fetch("/api/meta-capi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_name: eventName,
      event_id: eventId,
      event_source_url: window.location.href,
      user_data: {
        ...userData,
        fbp: getFbp(),
        fbc: getFbc(),
        client_user_agent: navigator.userAgent,
      },
      custom_data: customData,
    }),
  }).catch(() => {});
}

// Export helper for other components to fire events
export function trackMetaEvent(
  eventName: string,
  customData: Record<string, any> = {},
  userData: Record<string, string> = {}
) {
  const eventId = generateEventId();

  // Fire browser-side Pixel (if loaded)
  if (typeof window.fbq === "function") {
    window.fbq("track", eventName, customData, { eventID: eventId });
  }

  // Fire server-side CAPI with same event_id
  sendCapiEvent(eventName, eventId, userData, customData);
}

export default function TrackingScripts() {
  const [settings, setSettings] = useState<TrackingSettings>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch(() => {});
  }, []);

  // Meta Pixel initialization + PageView with deduplication
  useEffect(() => {
    if (!settings.meta_pixel_id) return;
    const existing = document.getElementById("meta-pixel-script");
    if (existing) return;

    const events = settings.meta_events || ["PageView"];
    const pageViewEventId = generateEventId();

    const script = document.createElement("script");
    script.id = "meta-pixel-script";
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${settings.meta_pixel_id}');
      ${events.includes("PageView") ? `fbq('track', 'PageView', {}, {eventID: '${pageViewEventId}'});` : ""}
    `;
    document.head.appendChild(script);

    const noscript = document.createElement("noscript");
    noscript.id = "meta-pixel-noscript";
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${settings.meta_pixel_id}&ev=PageView&noscript=1"/>`;
    document.head.appendChild(noscript);

    // Send PageView via CAPI with same event_id for deduplication
    if (events.includes("PageView")) {
      sendCapiEvent("PageView", pageViewEventId);
    }

    // Fire ViewContent if enabled (on page load)
    if (events.includes("ViewContent")) {
      const vcEventId = generateEventId();
      const waitForFbq = setInterval(() => {
        if (typeof window.fbq === "function") {
          clearInterval(waitForFbq);
          window.fbq("track", "ViewContent", {}, { eventID: vcEventId });
          sendCapiEvent("ViewContent", vcEventId);
        }
      }, 200);
      setTimeout(() => clearInterval(waitForFbq), 5000);
    }
  }, [settings.meta_pixel_id, settings.meta_events]);

  // Utmify
  useEffect(() => {
    if (!settings.utmify_token) return;
    const existing = document.getElementById("utmify-script");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "utmify-script";
    script.async = true;
    script.defer = true;
    script.src = "https://cdn.utmify.com.br/scripts/utms/latest.js";
    script.setAttribute("data-utmify-prevent-xcod-sck", "");
    script.setAttribute("data-utmify-prevent-subids", "");
    document.head.appendChild(script);
  }, [settings.utmify_token]);

  // Microsoft Clarity
  useEffect(() => {
    if (!settings.clarity_id) return;
    const existing = document.getElementById("clarity-script");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "clarity-script";
    script.innerHTML = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${settings.clarity_id}");
    `;
    document.head.appendChild(script);
  }, [settings.clarity_id]);

  // Meta Domain Verification
  useEffect(() => {
    if (!settings.meta_domain_verification) return;
    const existing = document.getElementById("meta-domain-verification");
    if (existing) return;

    const meta = document.createElement("meta");
    meta.id = "meta-domain-verification";
    meta.name = "facebook-domain-verification";
    meta.content = settings.meta_domain_verification;
    document.head.appendChild(meta);
  }, [settings.meta_domain_verification]);

  return null;
}

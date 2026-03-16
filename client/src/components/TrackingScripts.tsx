import { useEffect, useState } from "react";

interface TrackingSettings {
  meta_pixel_id?: string;
  meta_access_token?: string;
  utmify_token?: string;
  clarity_id?: string;
}

export default function TrackingScripts() {
  const [settings, setSettings] = useState<TrackingSettings>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!settings.meta_pixel_id) return;
    const existing = document.getElementById("meta-pixel-script");
    if (existing) return;

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
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    const noscript = document.createElement("noscript");
    noscript.id = "meta-pixel-noscript";
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${settings.meta_pixel_id}&ev=PageView&noscript=1"/>`;
    document.head.appendChild(noscript);
  }, [settings.meta_pixel_id]);

  useEffect(() => {
    if (!settings.utmify_token) return;
    const existing = document.getElementById("utmify-script");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "utmify-script";
    script.async = true;
    script.src = `https://cdn.utmify.com.br/scripts/utms/${settings.utmify_token}.js`;
    document.head.appendChild(script);
  }, [settings.utmify_token]);

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

  return null;
}

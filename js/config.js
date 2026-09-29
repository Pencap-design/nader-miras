/* ------------------------------------------------------------------
   Nader · Miras — invitation configuration
   Every piece of copy, every asset path and every link lives here.
   ------------------------------------------------------------------ */
window.NADER_CONFIG = {
  event: {
    brand: "نادر",
    brandHouse: "طلا و جواهر",   // shown before the brand on the printed card
    collection: "میراث",
    collectionLatin: "MIRAS",
    title: "رونمایی کالکشن میراث",
    date: "۸ مهر",
    time: "۱۸ الی ۲۰",
    address: [
      "خیابان محلاتی شمالی",
      "ورودی پیاده‌رو رادفر",
      "باغ ایسان"
    ]
  },

  copy: {
    invitation: "دعوت‌نامه‌ای برای شما",
    breakSeal: "مُهر را بگشایید",
    inviteLines: [
      "شما را به روایت تازه‌ای",
      "از میراث ایران دعوت می‌کند."
    ],
    unveil: "رونمایی کالکشن",
    continue: "ادامه",
    closingLine: "این روایت، بدون حضور شما کامل نیست.",
    closingWelcome: "منتظر دیدار شما هستیم.",
    rsvp: "تأیید حضور",
    rsvpDone: "حضور شما ثبت شد",
    route: "مشاهده مسیر مراسم",
    soundOn: "پخش صدا",
    soundOff: "قطع صدا"
  },

  links: {
    // RSVP target. Any URL works: a Google Form, Typeform, WhatsApp
    // (https://wa.me/98912XXXXXXX?text=...), or tel:/sms: links.
    // Leave empty to show an in-page acknowledgement only (nothing is sent).
    rsvp: "",
    // Replace with a pinned Neshan / Balad / Google Maps share link for the venue.
    map: "https://www.google.com/maps/search/?api=1&query=JFRJ%2BQW7%20Shiraz"
  },

  assets: {
    logo: "assets/img/logo.webp",          // official emblem, transparent
    logoMask: "assets/img/logo-mask.webp", // same shape, white — drives the light sweep
    texture: "assets/img/texture-leather.webp"
  }
};

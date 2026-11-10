import { useEffect } from "react";

import { companyInfo, contactInfo } from "./content";

/**
 * Emits Organization structured data once, for the whole public site.
 *
 * Search engines and anyone inspecting the page can read the registered name
 * and CAC number without scraping the footer. `identifier` carries the CAC
 * number as a PropertyValue so the registration is machine-readable rather
 * than prose.
 *
 * Rendered as a `<script type="application/ld+json">` because React cannot
 * type a script child as JSON; the object is serialised with `JSON.stringify`.
 */
export function StructuredData() {
  useEffect(() => {
    const id = "jojuni-organization-jsonld";
    if (document.getElementById(id)) return;

    const payload = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: companyInfo.tradingName,
      legalName: companyInfo.legalName,
      url: "https://www.jojunitechnologies.com.ng",
      email: contactInfo.email,
      telephone: "+2348059363013",
      address: {
        "@type": "PostalAddress",
        streetAddress: "1, Mpi Avenue, off Chinda Road, off Ada George Road",
        addressLocality: "Port Harcourt",
        addressRegion: "Rivers State",
        addressCountry: "NG",
      },
      identifier: {
        "@type": "PropertyValue",
        name: "CAC Registration Number",
        propertyID: "RC",
        value: companyInfo.rcNumber,
      },
      foundingLocation: {
        "@type": "Place",
        name: companyInfo.jurisdiction,
      },
    };

    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(payload);
    document.head.appendChild(script);

    return () => {
      document.getElementById(id)?.remove();
    };
  }, []);

  return null;
}

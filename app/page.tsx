import ConceptPage from "./concept/page";

export default function HomePage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const siteUrl = basePath
    ? `https://anton-gorokhovatsky.github.io${basePath}`
    : "https://ks.fish";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Рыбная лавка капитана Селедкина",
    url: `${siteUrl}/`,
    telephone: "+79166751452",
    image: `${siteUrl}/images/fish-02.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "ул. Строителей, д. 7, корп. 1",
      addressLocality: "Москва",
      addressCountry: "RU",
    },
    openingHours: "Mo-Su 11:00-20:00",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ConceptPage />
    </>
  );
}

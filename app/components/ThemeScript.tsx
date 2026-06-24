import Script from "next/script";

export function ThemeScript() {
  const script = `(function(){try{var s=localStorage.getItem("caresync-theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var u=s==="dark"||(s!=="light"&&d);document.documentElement.classList.toggle("dark",u);}catch(e){}})();`;

  return <Script id="theme-script" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: script }} />;
}

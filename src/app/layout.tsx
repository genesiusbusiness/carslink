import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { RadixClassNameFix } from "@/components/fix/RadixClassNameFix"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CarsLink - Votre garage de confiance",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, minimum-scale=1.0, user-scalable=yes, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CarsLink" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="format-detection" content="telephone=no" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Patch pour className.split() - doit s'exécuter AVANT React/Radix UI
                // Fonction pour patcher className sur un prototype
                function patchClassName(proto) {
                  if (!proto) {
                    return;
                  }
                  
                  let originalDescriptor = Object.getOwnPropertyDescriptor(proto, 'className');
                  if (!originalDescriptor) {
                    const parentProto = Object.getPrototypeOf(proto);
                    if (parentProto) {
                      originalDescriptor = Object.getOwnPropertyDescriptor(parentProto, 'className');
                    }
                  }
                  
                  if (originalDescriptor) {
                    const originalGet = originalDescriptor.get;
                    const originalSet = originalDescriptor.set;
                    
                    Object.defineProperty(HTMLElement.prototype, 'className', {
                      get: function() {
                        try {
                          if (originalGet) {
                            const value = originalGet.call(this);
                            // Toujours retourner une chaîne
                            if (typeof value === 'string') {
                              return value;
                            }
                            // Si ce n'est pas une chaîne, récupérer depuis l'attribut
                            const classAttr = this.getAttribute('class');
                            return typeof classAttr === 'string' ? classAttr : '';
                          }
                        } catch (e) {
                          // En cas d'erreur, retourner depuis l'attribut
                        }
                        const classAttr = this.getAttribute('class');
                        return typeof classAttr === 'string' ? classAttr : '';
                      },
                  }
                }
                
                // Patcher HTMLElement
                if (typeof HTMLElement !== 'undefined') {
                  patchClassName(HTMLElement.prototype);
                }
                
                // Patcher SVGElement aussi
                if (typeof SVGElement !== 'undefined') {
                  patchClassName(SVGElement.prototype);
                }
                
                // Patcher Element comme fallback
                if (typeof Element !== 'undefined') {
                  patchClassName(Element.prototype);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} h-full w-full overflow-hidden`}>
        <RadixClassNameFix />
        {children}
        <Toaster />
      </body>
    </html>
  )
}


"use client"

import { usePathname } from "next/navigation"
import { useLayoutEffect, useRef, type ReactNode } from "react"

// Leaf-level content elements: when we reach one, we animate it as a whole and
// stop descending (its inline children ride along with it).
const LEAF_TAGS = new Set([
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "P",
  "BUTTON",
  "A",
  "IMG",
  "INPUT",
  "LABEL",
  "LI",
])

// Elements we treat as a single atomic block (animate whole, don't descend).
// HEADER keeps the nav bar as one quick reveal; anything tagged data-stagger
// (e.g. cards) stays atomic instead of cascading its own internals.
const ATOMIC_TAGS = new Set(["HEADER"])

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) return

    // Walk the tree in document order. Structural wrappers (div, section, main,
    // form, ul, nav…) are transparent — we descend through them and stagger the
    // meaningful content inside, so every page cascades top-to-bottom.
    const blocks: HTMLElement[] = []
    const walk = (node: HTMLElement) => {
      for (const child of Array.from(node.children) as HTMLElement[]) {
        // Skip decorative layers (background, faded logo, etc.).
        if (child.getAttribute("aria-hidden") === "true" || child.hasAttribute("data-no-stagger")) {
          continue
        }
        const isAtomic =
          child.hasAttribute("data-stagger") ||
          ATOMIC_TAGS.has(child.tagName) ||
          LEAF_TAGS.has(child.tagName)

        if (isAtomic) {
          blocks.push(child)
          // Do not descend: inner content reveals together with this block.
        } else {
          walk(child)
        }
      }
    }
    walk(container)

    blocks.forEach((el, index) => {
      const delay = Math.min(index * 80, 1200)
      // The `.stagger-item` class holds the keyframe (kept in the CSS bundle);
      // only the per-element delay is set inline so each block reveals in turn.
      el.style.animationDelay = `${delay}ms`
      el.classList.add("stagger-item")
    })

    return () => {
      blocks.forEach((el) => {
        el.classList.remove("stagger-item")
        el.style.animationDelay = ""
      })
    }
  }, [pathname])

  return (
    <div key={pathname} ref={containerRef}>
      {children}
    </div>
  )
}

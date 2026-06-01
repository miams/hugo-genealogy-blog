---
title: "{{ replace .File.ContentBaseName "-" " " | title }}"
date: {{ .Date }}
draft: true
layout: heirloom

# Title band ---------------------------------------------------------------
# `categories[0]` renders as the small kicker above the title.
# `lifespan` renders just under the title (use an en-dash, e.g. "1858 – 1907").
categories: []
lifespan: ""

# Hero ---------------------------------------------------------------------
# Full-bleed image under the title band. Omit `hero` to fall back to the
# minimal band treatment (no broken image).
hero: ""
hero_alt: ""
hero_caption: ""

# Tags chips at the foot of the post.
tags: []

# Family relations ---------------------------------------------------------
# Drives the parents-siblings + spouse-children widgets at the top of the
# article. Each PersonRow accepts: { name, life, role?, href?, current? }.
# Omit any branch you don't have data for; the widget skips it.
relations:
  parents:
    # - { name: "Father Name",   life: "YYYY–YYYY", role: "Father" }
    # - { name: "Mother Name",   life: "YYYY–YYYY", role: "Mother" }
  siblings:
    # Order siblings chronologically; mark the post's subject `current: true`
    # so the row gets the accent highlight.
    # - { name: "Older Sibling", life: "YYYY–YYYY" }
    # - { name: "Subject Name",  life: "YYYY–YYYY", current: true }
  # spouse:
  #   { name: "Spouse Name",     life: "YYYY–YYYY" }
  # marriage:
  #   { date: "DD Month YYYY",   place: "Place" }
  # children:
  #   - { name: "Child Name",    life: "YYYY–YYYY" }

# Story timeline -----------------------------------------------------------
# Each entry is one chapter on the interactive life axis.
#   layer:  subject (default) | family | history
#   imgpos: top (default) | left | right     — image shows in full-zoom mode only
storytimeline: []
  # - year: YYYY
  #   age:  N
  #   kind: Birth          # short badge — Birth, Move, Work, Marriage, Death, War, Panic, …
  #   title: "…"
  #   place: "…"
  #   body:  "…"
  #   img:    "/img/NNN/…"
  #   imgpos: "top"
---

<!--
  Body conventions (see CLAUDE.md Part II):
   - Open with prose; keep the body at the reading measure (set by base.css).
   - For archival evidence use the `plate` shortcode.
   - For primary-source transcriptions use the `transcript` shortcode.
   - Hugo's standard `[^1]` footnotes generate the Sources apparatus at
     the foot of the post; cite in Evidence Explained form.
   - For the at-a-glance intro strip use the `timeline` shortcode.
   - For the interactive story axis use the `storytimeline` shortcode
     (its content is driven by `storytimeline:` front-matter, above).
-->

Opening paragraph of the article goes here.

## Sources


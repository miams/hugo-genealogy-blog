# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Hugo-based genealogy blog using the PaperMod theme, deployed on Netlify. The site focuses on family history research and genealogical documentation.

## Essential Commands

### Development
- Start development server: `hugo -b http://127.0.0.1:8888/ -w --buildDrafts -F`
- Build for production: `hugo --gc --minify`
- Format code: `pnpm prettier --write .`
- Install dependencies: `pnpm install`

### Git and Deployment
- SSH setup (required for push): `ssh-add ~/.ssh/miams-github`
- Deploy: `git push origin main` (auto-deploys to Netlify)
- Check deployment status: `netlify status`

## Architecture

### Content Structure
- **Posts**: Located in `content/posts/[###]/` directories with index.md or specific filename
- **Data Sources**: YAML files in `data/` (findagrave.yml contains genealogical records, slave.yml for historical data)
- **Static Assets**: Images, PDFs, and documents organized by post number in `static/img/[###]/` and `static/files/[###]/`

### Custom Components
- **Shortcodes**: `layouts/shortcodes/` contains custom Hugo shortcodes for:
  - `03_findagrave.html`: DataTables integration for genealogical records
  - `01_slavery.html`: Historical context displays
  - `book-list.html`: Bibliography rendering
- **Partials**: Custom layouts override theme defaults, including Google Analytics integration

### Theme and Styling
- Uses hugo-PaperMod theme as Git submodule in `themes/hugo-PaperMod/`
- Custom CSS overrides in `assets/css/extended/theme-vars.css`
- DataTables integration for interactive genealogical data display

### Data Integration
- Large YAML datasets (findagrave.yml ~900KB) contain structured genealogical information
- Custom shortcodes render this data as sortable tables using DataTables
- Images and documents are systematically organized by post number

## Configuration Notes

- Hugo v0.142.0 (extended) required
- Site deploys automatically via Netlify on push to main branch
- Google Analytics tracking ID: G-G7BZ69D7P6
- Base URL: https://blog.iams.name
- Excludes .txt files from posts directory during build
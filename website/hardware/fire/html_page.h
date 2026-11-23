#pragma once
#include <Arduino.h>

const char htmlHomePage[] PROGMEM = R"HTMLHOMEPAGE(<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔥</text></svg>">
    <title>Fire-Fighting Rover</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Raleway:wght@200;300;400;500&family=DM+Mono:wght@300;400&display=swap');

        * {
            margin: 0; padding: 0; box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
        }

        :root {
            --gold-bright:  #F5C842;
            --gold:         #D4A520;
            --gold-dim:     #A8811A;
            --gold-pale:    #7a5f13;
            --gold-glow:    rgba(212,165,32,0.25);
            --gold-trace:   rgba(212,165,32,0.10);
            --warm-black:   #0E0C09;
            --warm-900:     #161310;
            --warm-800:     #1E1A14;
            --warm-700:     #28231A;
            --warm-600:     #342D21;
            --warm-500:     #4A4030;
            --text-bright:  #F0E6D0;
            --text-mid:     #A89070;
            --text-dim:     #6B5A40;
            --sonic-violet: #C084FC;

            /* Water Cannon ON colour (aqua-teal) */
            --water:        #2DD4BF;
            --water-bright: #99F6E4;
            --water-deep:   #0F766E;
            --water-dark:   #134E4A;
        }

        body {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex; justify-content: center; align-items: center;
            padding: 24px;
            font-family: 'Raleway', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: var(--text-bright);
            background: var(--warm-black);
            position: relative; overflow-x: hidden;
        }

        body::before {
            content: '';
            position: fixed; inset: 0; z-index: 0;
            background:
                radial-gradient(ellipse at 20% 0%, rgba(180,120,20,0.12) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 100%, rgba(150,90,10,0.10) 0%, transparent 50%),
                radial-gradient(ellipse at 50% 50%, #1a1409 0%, var(--warm-black) 70%);
            pointer-events: none;
        }

        body::after {
            content: '';
            position: fixed; inset: 0; z-index: 0;
            background-image:
                radial-gradient(circle, rgba(212,165,32,0.4) 1px, transparent 1px),
                radial-gradient(circle, rgba(212,165,32,0.2) 1px, transparent 1px);
            background-size: 120px 120px, 80px 80px;
            background-position: 0 0, 40px 40px;
            pointer-events: none; opacity: 0.15;
        }

        .container {
            width: 100%; max-width: 1120px;
            background: var(--warm-900);
            border-radius: 32px;
            overflow: visible;
            border: 1px solid rgba(212,165,32,0.2);
            position: relative; z-index: 1;
            box-shadow:
                0 0 0 1px rgba(212,165,32,0.05) inset,
                0 50px 120px rgba(0,0,0,0.8),
                0 0 80px rgba(180,120,10,0.06);
            animation: fadeUp 0.6s ease forwards;
        }

        /* ── Header ── */
        .header {
            padding: 36px 44px 28px;
            background: linear-gradient(135deg, var(--warm-800) 0%, var(--warm-900) 100%);
            position: relative; overflow: hidden;
            border-top-left-radius: 32px;
            border-top-right-radius: 32px;
            border-bottom: 1px solid rgba(212,165,32,0.15);
        }
        .header::before {
            content: '';
            position: absolute; top: 0; left: 0; right: 0; height: 1px;
            background: linear-gradient(90deg,
                transparent 0%, var(--gold-dim) 20%,
                var(--gold-bright) 50%, var(--gold-dim) 80%, transparent 100%);
        }
        .header-divider {
            display: flex; align-items: center; justify-content: center;
            gap: 0; margin-top: 20px; width: 100%;
            position: relative; z-index: 1;
        }
        .header-divider::before,
        .header-divider::after {
            content: ''; flex: 1; height: 1px;
            background: linear-gradient(90deg, transparent, rgba(212,165,32,0.35));
        }
        .header-divider::after {
            background: linear-gradient(90deg, rgba(212,165,32,0.35), transparent);
        }
        .header-divider-diamond {
            width: 7px; height: 7px;
            background: var(--gold-dim);
            transform: rotate(45deg);
            margin: 0 14px;
            box-shadow: 0 0 8px rgba(212,165,32,0.5), 0 0 2px var(--gold);
            flex-shrink: 0;
        }
        .header::after {
            content: '';
            position: absolute; top: -100px; right: -100px;
            width: 350px; height: 350px; border-radius: 50%;
            background: radial-gradient(circle, rgba(212,165,32,0.08) 0%, transparent 65%);
            pointer-events: none;
        }
        .header-inner {
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; position: relative; z-index: 1;
            text-align: center; gap: 16px;
        }
        .header-left { display: flex; flex-direction: column; align-items: center; }
        .header-eyebrow {
            font-family: 'DM Mono', monospace, sans-serif;
            font-size: 10px; letter-spacing: 4px; text-transform: uppercase;
            color: var(--gold-dim); margin-bottom: 10px;
            display: flex; align-items: center; gap: 10px;
        }
        .header-eyebrow::before {
            content: ''; width: 24px; height: 1px;
            background: linear-gradient(90deg, transparent, var(--gold-dim));
        }
        .header-eyebrow::after {
            content: ''; width: 24px; height: 1px;
            background: linear-gradient(90deg, var(--gold-dim), transparent);
        }
        .header h1 {
            font-family: 'Cinzel', 'Trajan Pro', 'Georgia', serif;
            font-size: 32px; font-weight: 500;
            letter-spacing: 3px; text-transform: uppercase;
            background: linear-gradient(135deg, var(--text-bright) 0%, var(--gold) 50%, var(--text-bright) 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .header-badge {
            display: flex; align-items: center; gap: 8px;
            padding: 8px 18px;
            border: 1px solid rgba(212,165,32,0.25);
            border-radius: 50px;
            background: rgba(212,165,32,0.06);
            -webkit-backdrop-filter: blur(10px);
            backdrop-filter: blur(10px);
        }
        .header-badge-dot {
            width: 6px; height: 6px; border-radius: 50%;
            background: var(--gold);
            box-shadow: 0 0 8px var(--gold);
            animation: pulse 2s infinite;
        }
        .header-badge span {
            font-family: 'DM Mono', monospace, sans-serif;
            font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
            color: var(--gold-dim);
        }
        .header-badge.offline { border-color: rgba(107,90,64,0.4); background: rgba(107,90,64,0.08); }
        .header-badge.offline .header-badge-dot { background: var(--warm-500); box-shadow: none; animation: none; }
        .header-badge.offline span { color: var(--text-dim); }

        /* ── Integrated Sub-Header Notification Bar & History Tray ── */
        .notif-bar-wrapper {
            position: relative;
            z-index: 40;
            background: linear-gradient(180deg, rgba(22, 19, 16, 0.98), rgba(16, 14, 11, 0.98));
            border-bottom: 1px solid rgba(212, 165, 32, 0.16);
        }
        .notif-bar {
            display: flex; align-items: center; justify-content: space-between;
            min-height: 44px; padding: 10px 28px;
            cursor: pointer; user-select: none;
            transition: background 0.2s ease, border-color 0.2s ease;
        }
        .notif-bar:hover {
            background: rgba(212, 165, 32, 0.05);
        }
        .notif-bar:focus-visible {
            outline: 2px solid var(--gold); outline-offset: -2px;
        }
        .notif-left {
            display: flex; align-items: center; gap: 12px;
            flex: 1; min-width: 0;
        }
        .notif-dot {
            width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
            background: var(--gold-dim);
            transition: background 0.25s, box-shadow 0.25s;
        }
        .notif-viewport {
            overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
            flex: 1; min-width: 0;
        }
        .notif-text {
            display: inline-block;
            font-family: 'DM Mono', monospace, sans-serif;
            font-size: 11.5px; letter-spacing: 0.5px;
            color: var(--text-mid);
            transition: color 0.25s ease;
        }
        .notif-text.slide-in {
            animation: notifSlide 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes notifSlide {
            from { transform: translateY(6px); opacity: 0; }
            to   { transform: translateY(0); opacity: 1; }
        }
        .notif-right {
            display: flex; align-items: center; gap: 10px;
            flex-shrink: 0; margin-left: 14px;
        }
        .notif-badge {
            display: none;
            font-family: 'DM Mono', monospace, sans-serif;
            font-size: 10px; font-weight: 600; letter-spacing: 0.5px;
            padding: 2px 7px; border-radius: 12px;
            background: linear-gradient(135deg, var(--gold-pale), var(--gold-dim));
            color: var(--gold-bright);
            border: 1px solid rgba(245, 200, 66, 0.4);
            box-shadow: 0 0 8px rgba(212, 165, 32, 0.25);
        }
        .notif-chevron {
            font-size: 9px; color: var(--gold-dim);
            transition: transform 0.25s ease, color 0.2s;
        }
        .notif-bar.open .notif-chevron {
            transform: rotate(180deg);
            color: var(--gold-bright);
        }

        /* ── Scrollable History Tray ── */
        .notif-history {
            position: absolute; top: 100%; left: 0; right: 0;
            z-index: 60;
            background: rgba(14, 12, 9, 0.98);
            -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
            border-bottom: 1px solid rgba(212, 165, 32, 0.22);
            border-left: 1px solid rgba(212, 165, 32, 0.15);
            border-right: 1px solid rgba(212, 165, 32, 0.15);
            border-bottom-left-radius: 20px; border-bottom-right-radius: 20px;
            box-shadow: 0 20px 48px rgba(0, 0, 0, 0.8);
            display: flex; flex-direction: column; overflow: hidden;
            animation: historyDrop 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes historyDrop {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .notif-history-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 20px;
            background: rgba(26, 22, 17, 0.95);
            border-bottom: 1px solid rgba(212, 165, 32, 0.12);
        }
        .notif-history-title {
            font-family: 'DM Mono', monospace, sans-serif;
            font-size: 11px; letter-spacing: 1px; text-transform: uppercase;
            color: var(--gold); display: flex; align-items: center; gap: 8px;
        }
        .notif-history-count {
            font-size: 9.5px; color: var(--text-dim);
            background: rgba(255, 255, 255, 0.05);
            padding: 2px 7px; border-radius: 10px;
        }
        .notif-clear-btn {
            font-family: 'DM Mono', monospace, sans-serif;
            font-size: 10px; letter-spacing: 1px; text-transform: uppercase;
            color: var(--text-dim); background: transparent;
            border: 1px solid rgba(212, 165, 32, 0.22);
            padding: 4px 12px; border-radius: 8px;
            cursor: pointer; transition: all 0.2s;
        }
        .notif-clear-btn:hover {
            color: var(--gold-bright);
            border-color: var(--gold);
            background: rgba(212, 165, 32, 0.1);
        }
        .notif-history-list {
            overflow-y: auto; max-height: 250px;
            padding: 4px 0;
        }
        .notif-history-list::-webkit-scrollbar {
            width: 5px;
        }
        .notif-history-list::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.3);
        }
        .notif-history-list::-webkit-scrollbar-thumb {
            background: var(--gold-dim); border-radius: 3px;
        }
        .notif-history-item {
            display: flex; align-items: center; gap: 12px;
            padding: 8px 20px;
            font-family: 'DM Mono', monospace, sans-serif;
            font-size: 11px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            transition: background 0.15s ease;
        }
        .notif-history-item:hover {
            background: rgba(212, 165, 32, 0.06);
        }
        .notif-item-time {
            font-size: 9.5px; color: var(--text-dim);
            flex-shrink: 0; min-width: 56px;
        }
        .notif-item-dot {
            width: 6px; height: 6px; border-radius: 50%;
            flex-shrink: 0;
        }
        .notif-item-text {
            color: var(--text-bright);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            flex: 1; min-width: 0;
        }
        .notif-empty {
            padding: 28px 20px; text-align: center;
            font-family: 'DM Mono', monospace, sans-serif;
            font-size: 11px; color: var(--text-dim);
            letter-spacing: 0.5px;
        }

        /* ── Mode Selector ── */
        .mode-selector {
            display: flex; justify-content: center; gap: 10px;
            margin: 22px 28px;
            background: var(--warm-800);
            border-radius: 50px; padding: 6px;
            border: 1px solid rgba(212,165,32,0.12);
            box-shadow: inset 0 2px 8px rgba(0,0,0,0.3);
        }
        .mode-button {
            flex: 1; max-width: 220px;
            padding: 12px 24px;
            border: 1px solid transparent; border-radius: 50px;
            background: transparent;
            color: var(--text-dim);
            font-family: 'DM Mono', monospace, sans-serif;
            font-size: 11px; font-weight: 400;
            letter-spacing: 2px; text-transform: uppercase;
            cursor: pointer; transition: all 0.3s ease;
            touch-action: manipulation;
        }
        .mode-button.active {
            background: linear-gradient(135deg, var(--gold-pale), var(--gold-dim));
            color: var(--gold-bright);
            box-shadow:
                0 4px 20px rgba(212,165,32,0.25),
                inset 0 1px 0 rgba(245,200,66,0.3);
            border-color: rgba(212,165,32,0.3);
        }
        .mode-button:hover:not(.active) { color: var(--text-mid); }

        /* ── Layout ── */
        .main-content {
            display: grid; grid-template-columns: 1fr 1fr;
            gap: 20px; padding: 0 24px;
        }
        .main-content.auto-mode {
            grid-template-columns: 1fr; max-width: 540px; margin: 0 auto;
        }
        .bottom-section {
            padding: 0 24px 28px;
            display: flex; justify-content: center; margin-top: 20px;
        }

        /* ── Card ── */
        .control-group {
            background: linear-gradient(145deg, var(--warm-800), var(--warm-900));
            border-radius: 24px; padding: 28px;
            border: 1px solid rgba(212,165,32,0.12);
            box-shadow:
                0 8px 32px rgba(0,0,0,0.3),
                inset 0 1px 0 rgba(212,165,32,0.08),
                inset 0 -1px 0 rgba(0,0,0,0.2);
            position: relative; overflow: hidden;
            transition: border-color .4s ease, box-shadow .4s ease;
        }
        .control-group::before {
            content: '';
            position: absolute; top: 0; left: 20%; right: 20%; height: 1px;
            background: linear-gradient(90deg, transparent, rgba(212,165,32,0.3), transparent);
        }
        /* Suppression card glows */
        .control-group.firing-water {
            border-color: rgba(45,212,191,0.5);
            box-shadow:
                0 8px 32px rgba(0,0,0,0.3),
                0 0 40px rgba(45,212,191,0.18),
                inset 0 1px 0 rgba(45,212,191,0.25);
        }
        .control-group.firing-sonic {
            border-color: rgba(192,132,252,0.5);
            box-shadow:
                0 8px 32px rgba(0,0,0,0.3),
                0 0 40px rgba(192,132,252,0.16),
                inset 0 1px 0 rgba(192,132,252,0.25);
        }

        .section-title {
            font-family: 'DM Mono', monospace, sans-serif;
            font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
            color: var(--gold-dim);
            margin-bottom: 24px;
            display: flex; align-items: center; gap: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(212,165,32,0.1);
        }
        .section-title::before {
            content: ''; width: 16px; height: 1px;
            background: linear-gradient(90deg, var(--gold), transparent);
        }
        .section-title::after {
            content: '◆'; font-size: 6px; color: var(--gold-dim); margin-left: auto;
        }

        /* ── D-Pad ── */
        .control-grid {
            display: grid; grid-template-columns: repeat(3, 1fr);
            gap: 12px; margin: 0 auto; max-width: 250px;
        }
        .control-button {
            background: linear-gradient(145deg, var(--warm-700), var(--warm-800));
            border-radius: 20px; height: 76px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; font-size: 24px; font-family: inherit;
            color: var(--warm-500);
            border: 1px solid rgba(212,165,32,0.12);
            transition: all 0.2s ease;
            box-shadow:
                0 4px 12px rgba(0,0,0,0.4),
                inset 0 1px 0 rgba(255,255,255,0.04);
            position: relative; overflow: hidden;
            outline: none;
            -webkit-tap-highlight-color: transparent;
            -webkit-user-select: none; user-select: none;
            touch-action: none;
        }
        .control-button::after {
            content: '';
            position: absolute; inset: 0; border-radius: inherit;
            background: radial-gradient(circle at 50% 0%, rgba(212,165,32,0.10), transparent 60%);
            opacity: 0; transition: opacity 0.2s;
        }
        .control-button:hover {
            border-color: rgba(212,165,32,0.35);
            color: var(--gold-dim);
            box-shadow: 0 6px 20px rgba(0,0,0,0.4), 0 0 12px rgba(212,165,32,0.12);
            transform: translateY(-1px);
        }
        .control-button:hover::after { opacity: 1; }
        .control-button:active { transform: scale(0.94) translateY(0); }
        .control-button:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
        .control-button.active {
            background: linear-gradient(145deg, var(--gold-pale), var(--gold-dim));
            color: var(--gold-bright);
            border-color: var(--gold-dim);
            box-shadow:
                0 6px 24px rgba(212,165,32,0.35),
                inset 0 1px 0 rgba(245,200,66,0.4),
                0 0 0 1px rgba(212,165,32,0.2) inset;
        }
        .control-button.active::after { opacity: 0; }
        .center-button { color: rgba(122,95,19,0.6); font-size: 18px; }
        .center-button:hover { color: var(--gold-bright); border-color: rgba(212,165,32,0.3); }

        /* ── Sliders ── */
        .control-row { display: flex; align-items: center; margin-bottom: 20px; gap: 16px; }
        .control-label {
            width: 140px; font-size: 13px; font-weight: 300;
            color: var(--text-dim); flex-shrink: 0;
            letter-spacing: 0.5px;
            transition: color .3s ease;
        }
        .control-widget { flex: 1; min-width: 0; }
        .value-display {
            width: 50px; text-align: right;
            font-family: 'DM Mono', monospace, sans-serif; font-size: 13px;
            color: var(--gold); font-weight: 400;
            transition: color .3s ease, text-shadow .3s ease;
        }

        .slider {
            -webkit-appearance: none; appearance: none;
            width: 100%; height: 4px; border-radius: 2px; outline: none; display: block;
            --fill: 50%;
            --c1: var(--gold-dim); --c2: var(--gold);
            background: linear-gradient(90deg, var(--c1) 0%, var(--c2) var(--fill), var(--warm-600) var(--fill), var(--warm-600) 100%);
            touch-action: pan-x;
        }
        .slider:disabled { opacity: 0.4; cursor: not-allowed; }
        .slider::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none;
            width: 22px; height: 22px; border-radius: 50%;
            background: radial-gradient(circle at 35% 35%, var(--gold-bright), var(--gold));
            cursor: pointer; border: 2px solid var(--warm-800);
            box-shadow:
                0 0 0 2px rgba(212,165,32,0.3),
                0 4px 12px rgba(212,165,32,0.3),
                0 2px 6px rgba(0,0,0,0.5);
            transition: transform 0.15s ease;
        }
        .slider:not(:disabled)::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            box-shadow:
                0 0 0 4px rgba(212,165,32,0.2),
                0 6px 20px rgba(212,165,32,0.4),
                0 2px 8px rgba(0,0,0,0.5);
        }
        .slider::-moz-range-track { height: 4px; border-radius: 2px; background: var(--warm-600); }
        .slider::-moz-range-progress { height: 4px; border-radius: 2px; background: var(--c2); }
        .slider::-moz-range-thumb {
            width: 22px; height: 22px; border-radius: 50%;
            background: var(--gold); cursor: pointer;
            border: 2px solid var(--warm-800);
        }

        /* ── Toggles ── */
        .switch { position: relative; display: inline-block; width: 56px; height: 30px; }
        .switch input { opacity: 0; width: 0; height: 0; position: absolute; }
        .slider-toggle {
            position: absolute; cursor: pointer; inset: 0;
            background: var(--warm-700);
            border: 1px solid rgba(212,165,32,0.18);
            border-radius: 34px; transition: .35s;
            box-shadow: inset 0 2px 6px rgba(0,0,0,0.3);
            touch-action: manipulation;
        }
        .slider-toggle:before {
            content: ''; position: absolute;
            height: 22px; width: 22px; left: 3px; bottom: 3px;
            background: var(--warm-500);
            border-radius: 50%; transition: .35s;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }
        .switch input:focus-visible + .slider-toggle { outline: 2px solid var(--gold); outline-offset: 2px; }
        .switch input:checked + .slider-toggle {
            background: linear-gradient(135deg, var(--gold-pale), var(--gold-dim));
            border-color: rgba(212,165,32,0.4);
            box-shadow: 0 0 16px rgba(212,165,32,0.25), inset 0 2px 6px rgba(0,0,0,0.2);
        }
        .switch input:checked + .slider-toggle:before {
            transform: translateX(26px);
            background: radial-gradient(circle at 35% 35%, var(--gold-bright), var(--gold));
            box-shadow: 0 0 10px rgba(212,165,32,0.5), 0 2px 6px rgba(0,0,0,0.3);
        }

        /* Water Cannon ON */
        .water-switch input:checked + .slider-toggle {
            background: linear-gradient(135deg, var(--water-dark), var(--water-deep));
            border-color: var(--water);
            box-shadow: 0 0 20px rgba(45,212,191,0.45), inset 0 2px 6px rgba(0,0,0,0.2);
        }
        .water-switch input:checked + .slider-toggle:before {
            background: radial-gradient(circle at 35% 35%, var(--water-bright), var(--water));
            box-shadow: 0 0 14px rgba(45,212,191,0.8), 0 2px 6px rgba(0,0,0,0.3);
        }
        .control-row.water-on .control-label { color: var(--water-bright); }
        .control-row.water-on .value-display {
            color: var(--water);
            text-shadow: 0 0 10px rgba(45,212,191,0.7);
        }

        /* Sonic Wave toggle */
        .sonic-switch input:checked + .slider-toggle {
            background: linear-gradient(135deg, #4A1D6A, #7E22CE);
            border-color: var(--sonic-violet);
            box-shadow: 0 0 16px rgba(192,132,252,0.35);
        }
        .sonic-switch input:checked + .slider-toggle:before {
            background: radial-gradient(circle at 35% 35%, #F3E8FF, var(--sonic-violet));
            box-shadow: 0 0 12px rgba(192,132,252,0.7);
        }
        .control-row.sonic-on .value-display {
            color: var(--sonic-violet);
            text-shadow: 0 0 10px rgba(192,132,252,0.7);
        }

        /* Auto Mode Relay toggle */
        .auto-switch input:checked + .slider-toggle {
            background: linear-gradient(135deg, #78350F, #D97706);
            border-color: var(--gold-bright);
            box-shadow: 0 0 16px rgba(245,200,66,0.35);
        }
        .auto-switch input:checked + .slider-toggle:before {
            background: radial-gradient(circle at 35% 35%, #FEF3C7, var(--gold-bright));
            box-shadow: 0 0 12px rgba(245,200,66,0.7);
        }
        .control-row.auto-on .value-display {
            color: var(--gold-bright);
            text-shadow: 0 0 10px rgba(245,200,66,0.7);
        }

        .switch input:disabled + .slider-toggle {
            opacity: 0.35; cursor: not-allowed;
        }

        /* ── Status ── */
        .status {
            display: flex; align-items: center; gap: 10px;
            padding: 12px 18px;
            font-family: 'DM Mono', monospace, sans-serif; font-size: 11px; letter-spacing: 1px;
            background: var(--warm-black);
            border-radius: 14px; margin-top: 18px;
            border: 1px solid rgba(212,165,32,0.12);
        }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .connected    { color: var(--gold-bright); }
        .connected .status-dot    { background: var(--gold-bright); box-shadow: 0 0 10px var(--gold-bright); }
        .disconnected { color: var(--text-dim); }
        .disconnected .status-dot { background: var(--warm-500); }
        .connecting   { color: var(--text-dim); }
        .connecting .status-dot   { background: var(--gold-dim); animation: pulse 1.5s infinite; }

        /* Locked hint */
        .locked-hint {
            display: none;
            font-family: 'DM Mono', monospace, sans-serif;
            font-size: 10px; letter-spacing: 1px;
            color: #EF4444; opacity: 0.85;
            margin-left: 6px;
        }
        .locked-hint.show { display: inline; }

        .switches-container { max-width: 540px; width: 100%; }
        .hidden { display: none !important; }

        @keyframes pulse      { 0%,100%{opacity:.3; transform:scale(1)} 50%{opacity:1; transform:scale(1.2)} }
        @keyframes moveUp     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes moveDown   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(4px)} }
        @keyframes moveLeft   { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-4px)} }
        @keyframes moveRight  { 0%,100%{transform:translateX(0)} 50%{transform:translateX(4px)} }
        .up-active    { animation: moveUp 0.5s infinite; }
        .down-active  { animation: moveDown 0.5s infinite; }
        .left-active  { animation: moveLeft 0.5s infinite; }
        .right-active { animation: moveRight 0.5s infinite; }

        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }

        .noselect { -webkit-user-select: none; user-select: none; }

        /* ── Mobile Responsive Optimizations ── */
        @media (max-width: 780px) {
            body {
                padding: 12px 8px;
                padding-top: max(12px, env(safe-area-inset-top));
                padding-bottom: max(12px, env(safe-area-inset-bottom));
                padding-left: max(8px, env(safe-area-inset-left));
                padding-right: max(8px, env(safe-area-inset-right));
            }
            .container { border-radius: 20px; }
            .header { padding: 22px 16px 20px; border-top-left-radius: 20px; border-top-right-radius: 20px; }
            .header h1 { font-size: 22px; letter-spacing: 2px; }
            .notif-bar { padding: 8px 16px; min-height: 38px; }
            .notif-text { font-size: 10.5px; }
            .mode-selector { margin: 16px 14px; }
            .mode-button { padding: 10px 14px; font-size: 10px; }
            .main-content { grid-template-columns: 1fr; gap: 16px; padding: 0 14px; }
            .control-group { padding: 20px 16px; border-radius: 18px; }
            .control-grid { max-width: 230px; gap: 10px; }
            .control-button { height: 68px; font-size: 22px; border-radius: 16px; }
            .control-row { margin-bottom: 16px; gap: 10px; }
            .control-label { width: 100px; font-size: 11px; }
            .value-display { font-size: 11px; width: 44px; }
            .bottom-section { padding: 0 14px 20px; margin-top: 14px; }
        }

        html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
        #relayControl .control-label { width: auto; flex: 1; min-width: 0; }

        /* Speed zones */
        .slider.zone-low  { --c1: var(--gold-dim);    --c2: var(--gold); }
        .slider.zone-mid  { --c1: var(--gold);        --c2: var(--gold-bright); }
        .slider.zone-high { --c1: var(--gold-bright); --c2: #FF7A3D; }
        #SpeedValue.zone-low  { color: var(--gold); }
        #SpeedValue.zone-mid  { color: var(--gold-bright); }
        #SpeedValue.zone-high { color: #FF7A3D; text-shadow: 0 0 10px rgba(255,122,61,0.6); }

        /* Extra-small phones */
        @media (max-width: 400px) {
            .header { padding: 18px 12px 16px; }
            .header h1 { font-size: 18px; letter-spacing: 1.5px; }
            .header-eyebrow { font-size: 9px; letter-spacing: 2.5px; }
            .header-eyebrow::before, .header-eyebrow::after { width: 14px; }
            .header-badge { padding: 6px 14px; }
            .notif-bar { padding: 6px 12px; }
            .notif-text { font-size: 10px; }
            .mode-selector { margin: 14px 10px; gap: 6px; }
            .mode-button { padding: 10px 8px; letter-spacing: 1px; }
            .main-content { padding: 0 10px; }
            .bottom-section { padding: 0 10px 16px; }
            .control-group { padding: 16px 12px; }
            .control-label { width: 84px; }
            .control-row { gap: 8px; }
            .value-display { width: 38px; }
            .control-grid { max-width: 210px; }
            .control-button { height: 62px; }
            .section-title { letter-spacing: 2px; }
        }

        /* Landscape */
        @media (orientation: landscape) and (max-height: 520px) {
            body { align-items: flex-start; }
            .header { padding: 12px 20px; }
            .header-eyebrow, .header-divider { display: none; }
            .header-inner { flex-direction: row; justify-content: space-between; gap: 12px; }
            .header h1 { font-size: 18px; letter-spacing: 2px; }
            .mode-selector { margin: 10px 14px; }
            .main-content { grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 14px; }
            .main-content.auto-mode { grid-template-columns: 1fr; }
            .control-group { padding: 14px; }
            .control-grid { gap: 8px; }
            .control-button { height: 56px; }
            .control-row { margin-bottom: 12px; }
            .section-title { margin-bottom: 14px; }
            .bottom-section { padding: 0 14px 14px; margin-top: 12px; }
        }
    </style>
</head>
<body class="noselect">
<div class="container">

    <div class="header">
        <div class="header-inner">
            <div class="header-left">
                <div class="header-eyebrow">Advanced Robotics System</div>
                <h1>Control Interface</h1>
            </div>
            <div class="header-badge offline" id="headerBadge">
                <div class="header-badge-dot"></div>
                <span id="badgeText">System Offline</span>
            </div>
            <div class="header-divider">
                <div class="header-divider-diamond"></div>
            </div>
        </div>
    </div>

    <!-- ── Integrated Sub-Header Notification Bar & History Tray ── -->
    <div class="notif-bar-wrapper" id="notifWrapper">
        <div class="notif-bar" id="notifBar" role="button" aria-expanded="false" aria-controls="notifHistory" tabindex="0" title="Click to view notification history">
            <div class="notif-left">
                <span class="notif-dot" id="notifDot"></span>
                <div class="notif-viewport">
                    <span class="notif-text" id="notifText">System ready</span>
                </div>
            </div>
            <div class="notif-right">
                <span class="notif-badge" id="notifBadge">0</span>
                <span class="notif-chevron" id="notifChevron">▼</span>
            </div>
        </div>
        <div class="notif-history" id="notifHistory" style="display:none;" role="region" aria-label="Notification History">
            <div class="notif-history-header">
                <div class="notif-history-title">
                    <span>Notification Log</span>
                    <span class="notif-history-count" id="notifHistoryCount">0 events</span>
                </div>
                <button class="notif-clear-btn" id="notifClearBtn" type="button">Clear</button>
            </div>
            <div class="notif-history-list" id="notifHistoryList">
                <div class="notif-empty">No logged events</div>
            </div>
        </div>
    </div>

    <div class="mode-selector">
        <button class="mode-button active" id="manualModeBtn" onclick="setMode('manual')">Manual Mode</button>
        <button class="mode-button" id="autoModeBtn" onclick="setMode('auto')">Automatic Mode</button>
    </div>

    <div class="main-content" id="mainContent">

        <!-- Movement Controls -->
        <div class="control-group" id="movementControls">
            <div class="section-title">Movement Controls</div>
            <div class="control-grid">
                <div></div>
                <button class="control-button" id="upButton" data-dir="up" aria-label="Forward">↑</button>
                <div></div>
                <button class="control-button" id="leftButton" data-dir="left" aria-label="Left">←</button>
                <button class="control-button center-button" id="stopButton" aria-label="Stop">◉</button>
                <button class="control-button" id="rightButton" data-dir="right" aria-label="Right">→</button>
                <div></div>
                <button class="control-button" id="downButton" data-dir="down" aria-label="Reverse">↓</button>
                <div></div>
            </div>
        </div>

        <!-- Settings -->
        <div class="control-group" id="settingsControls">
            <div class="section-title">Settings &amp; Servos</div>

            <div class="control-row" id="speedControl">
                <div class="control-label">Speed</div>
                <div class="control-widget"><input type="range" min="0" max="255" value="200" class="slider" id="Speed" aria-label="Speed"></div>
                <div class="value-display" id="SpeedValue">200</div>
            </div>

            <div class="control-row" id="lightControl">
                <div class="control-label">Headlight</div>
                <div class="control-widget"><input type="range" min="0" max="255" value="0" class="slider" id="Light" aria-label="Headlight"></div>
                <div class="value-display" id="LightValue">0</div>
            </div>

            <div class="control-row" id="panControl">
                <div class="control-label">Cam Pan</div>
                <div class="control-widget"><input type="range" min="0" max="180" value="15" class="slider" id="Pan" aria-label="Camera pan"></div>
                <div class="value-display" id="PanValue">15°</div>
            </div>

            <div class="control-row" id="tiltControl">
                <div class="control-label">Cam Tilt</div>
                <div class="control-widget"><input type="range" min="0" max="180" value="106" class="slider" id="CamTilt" aria-label="Camera tilt"></div>
                <div class="value-display" id="CamTiltValue">106°</div>
            </div>

            <div class="control-row" id="wDirectionControl">
                <div class="control-label">Sonar Sweep</div>
                <div class="control-widget"><input type="range" min="0" max="180" value="45" class="slider" id="Tilt" aria-label="Sonar sweep"></div>
                <div class="value-display" id="TiltValue">45°</div>
            </div>

            <div class="status connecting" id="connectionStatus">
                <span class="status-dot"></span>
                <span id="statusText">Connecting to systems...</span>
            </div>
        </div>

    </div>

    <!-- Fire Suppression Switches -->
    <div class="bottom-section">
        <div class="control-group switches-container" id="relayControl">
            <div class="section-title">Suppression Systems</div>

            <!-- Water Cannon (Relay GPIO 16) -->
            <div class="control-row" id="waterRow">
                <div class="control-label">
                    💧 Water Cannon
                </div>
                <div class="control-widget">
                    <label class="switch water-switch">
                        <input type="checkbox" id="Relay" aria-label="Water cannon">
                        <span class="slider-toggle"></span>
                    </label>
                </div>
                <div class="value-display" id="RelayStatus">OFF</div>
            </div>

            <!-- Sonic Wave Cannon (Direct TP3110 Amplifier on GPIO 26, NO RELAY) -->
            <div class="control-row" id="sonicRow">
                <div class="control-label">
                    🔊 Sonic Wave Cannon
                    <span style="display:block;font-size:10px;color:var(--text-mid);letter-spacing:0.5px;font-family:'DM Mono',monospace;">TP3110 Amp · Direct GPIO 26 (No Relay) · Extinguish Flame</span>
                </div>
                <div class="control-widget">
                    <label class="switch sonic-switch">
                        <input type="checkbox" id="Relay2" aria-label="Sonic wave cannon">
                        <span class="slider-toggle"></span>
                    </label>
                </div>
                <div class="value-display" id="Relay2Status">OFF</div>
            </div>
        </div>
    </div>

</div>
<script>
(function () {
    "use strict";

    var wsUrl = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/CarInput";
    var ws = null, reconnectTimer = null;
    var currentDirection = null, currentMode = "manual";

    var SWEEP_STEP = 2, SWEEP_DELAY = 120, sweepInterval = null;
    var panValue = 15, camTiltValue = 106, panDir = 1, camTiltDir = 1;

    var DEG_KEYS = ["Pan", "CamTilt", "Tilt"];
    var SLIDERS  = ["Speed", "Light", "Pan", "CamTilt", "Tilt"];
    var LABELS   = { Speed: "Speed", Light: "Headlight", Pan: "Cam Pan", CamTilt: "Cam Tilt", Tilt: "Sonar Sweep" };
    var DIR_TEXT = { up: "Moving forward", down: "Reversing", left: "Turning left", right: "Turning right" };

    function $(id) { return document.getElementById(id); }

    /* ── Sub-Header Notification & Scrollable History System ── */
    var notifHistory = [];
    var unreadCount = 0;
    var notifTimer = null;
    var isConnected = false;
    var MAX_HISTORY = 40;

    function formatTime(d) {
        var h = String(d.getHours());
        var m = String(d.getMinutes());
        var s = String(d.getSeconds());
        if (h.length < 2) h = "0" + h;
        if (m.length < 2) m = "0" + m;
        if (s.length < 2) s = "0" + s;
        return h + ":" + m + ":" + s;
    }

    function setBarVisual(text, type) {
        var textEl = $("notifText");
        var dotEl  = $("notifDot");
        if (!textEl || !dotEl) return;

        textEl.classList.remove("slide-in");
        void textEl.offsetWidth; // Force reflow for slide animation
        textEl.textContent = text;
        textEl.classList.add("slide-in");

        var colorMap = {
            gold:  { c: "var(--gold)",         shadow: "0 0 8px rgba(212,165,32,0.6)", textColor: "var(--text-bright)" },
            water: { c: "var(--water)",        shadow: "0 0 8px rgba(45,212,191,0.6)", textColor: "var(--water-bright)" },
            sonic: { c: "var(--sonic-violet)", shadow: "0 0 8px rgba(192,132,252,0.6)", textColor: "#F3E8FF" },
            ember: { c: "#FF7A3D",             shadow: "0 0 8px rgba(255,122,61,0.6)", textColor: "#FFD2B8" },
            warn:  { c: "#EF4444",             shadow: "0 0 8px rgba(239,68,68,0.6)", textColor: "#FCA5A5" },
            idle:  { c: "var(--gold-dim)",     shadow: "none",                          textColor: "var(--text-mid)" }
        };

        var cfg = colorMap[type] || colorMap.gold;
        dotEl.style.background = cfg.c;
        dotEl.style.boxShadow  = cfg.shadow;
        textEl.style.color     = cfg.textColor;
    }

    function renderHistory() {
        var list = $("notifHistoryList");
        var countEl = $("notifHistoryCount");
        if (!list) return;

        if (countEl) countEl.textContent = notifHistory.length + " event" + (notifHistory.length === 1 ? "" : "s");

        if (notifHistory.length === 0) {
            list.innerHTML = '<div class="notif-empty">No logged events</div>';
            return;
        }

        var html = "";
        for (var i = 0; i < notifHistory.length; i++) {
            var item = notifHistory[i];
            var dotColor = "var(--gold)";
            if (item.type === "water") dotColor = "var(--water)";
            else if (item.type === "sonic") dotColor = "var(--sonic-violet)";
            else if (item.type === "ember") dotColor = "#FF7A3D";
            else if (item.type === "warn")  dotColor = "#EF4444";

            html += '<div class="notif-history-item">' +
                '<span class="notif-item-time">' + item.time + '</span>' +
                '<span class="notif-item-dot" style="background:' + dotColor + '"></span>' +
                '<span class="notif-item-text">' + item.text + '</span>' +
                '</div>';
        }
        list.innerHTML = html;
    }

    function addHistoryItem(text, type, key) {
        var now = new Date();
        var timeStr = formatTime(now);

        // Slider messages: dragging updates one message and one log line instead of dozens
        if (key && notifHistory.length > 0 && notifHistory[0].key === key) {
            notifHistory[0].text = text;
            notifHistory[0].time = timeStr;
            notifHistory[0].type = type;
            renderHistory();
            return;
        }

        notifHistory.unshift({ text: text, type: type, time: timeStr, key: key || null });
        if (notifHistory.length > MAX_HISTORY) {
            notifHistory.pop();
        }

        // Increment gold unread badge if history tray is closed
        var historyEl = $("notifHistory");
        var isOpen = historyEl && historyEl.style.display !== "none";
        if (!isOpen) {
            unreadCount++;
            var badge = $("notifBadge");
            if (badge) {
                badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
                badge.style.display = "inline-block";
            }
        }
        renderHistory();
    }

    function notify(text, type, opts) {
        opts = opts || {};
        type = type || "gold";
        var key = opts.key || null;
        var ttl = opts.ttl || 2500;
        var sticky = !!opts.sticky;

        clearTimeout(notifTimer);

        setBarVisual(text, type);
        addHistoryItem(text, type, key);

        if (!sticky) {
            notifTimer = setTimeout(function () {
                if (!isConnected) {
                    // Disconnects: "Disconnected – reconnecting…" stays in red until connection returns
                    setBarVisual("Disconnected – reconnecting…", "warn");
                } else {
                    // Idle state: "System ready"
                    setBarVisual("System ready", "idle");
                }
            }, ttl);
        }
    }

    function toggleHistory(force) {
        var el = $("notifHistory");
        var bar = $("notifBar");
        if (!el || !bar) return;

        var open = (typeof force === "boolean") ? force : (el.style.display === "none");
        if (open) {
            el.style.display = "flex";
            bar.classList.add("open");
            bar.setAttribute("aria-expanded", "true");
            unreadCount = 0;
            var badge = $("notifBadge");
            if (badge) badge.style.display = "none";
        } else {
            el.style.display = "none";
            bar.classList.remove("open");
            bar.setAttribute("aria-expanded", "false");
        }
    }

    function clearHistory() {
        notifHistory = [];
        unreadCount = 0;
        var badge = $("notifBadge");
        if (badge) badge.style.display = "none";
        renderHistory();
    }

    /* ── WebSocket ── */
    function isOpen() { return ws && ws.readyState === WebSocket.OPEN; }
    function send(key, value) {
        if (isOpen()) { ws.send(key + "," + value); return true; }
        return false;
    }
    function requireConn(text) {
        if (isOpen()) return true;
        notify(text || "Not connected - command not sent", "warn", { key: "noconn", ttl: 2500 });
        return false;
    }

    function connect() {
        clearTimeout(reconnectTimer);
        try { ws = new WebSocket(wsUrl); } catch (e) { scheduleReconnect(); return; }

        ws.onopen = function () {
            isConnected = true;
            setStatus("Connected to vehicle systems", true);
            notify("Connected to rover", "gold", { key: "connok" });
            SLIDERS.forEach(function (id) {
                var el = $(id);
                if (el) send(id, el.value);
            });
            send("Relay", "0");
            send("Relay2", "0");
            send("AMRelay", currentMode === "auto" ? "1" : "0");
        };
        ws.onclose = function () {
            var wasMoving = !!currentDirection;
            isConnected = false;
            setStatus("Disconnected - reconnecting...", false);
            stopMovementLocal();
            var w = $("Relay"), s = $("Relay2");
            if (w) w.checked = false;
            if (s) s.checked = false;
            refreshRelayUI();

            // Disconnects: stays in the bar in red until connection returns
            setBarVisual("Disconnected – reconnecting…", "warn");
            addHistoryItem(wasMoving ? "Connection lost while moving" : "Disconnected – reconnecting…", "warn", "conn");
            scheduleReconnect();
        };
        ws.onerror = function () { setStatus("Control connection error", false); };
    }

    function scheduleReconnect() {
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 2000);
    }

    function setStatus(message, online) {
        var st = $("statusText"); if (st) st.textContent = message;
        var cs = $("connectionStatus"); if (cs) cs.className = "status " + (online ? "connected" : "disconnected");
        var hb = $("headerBadge"); if (hb) hb.classList.toggle("offline", !online);
        var bt = $("badgeText"); if (bt) bt.textContent = online ? "System Online" : "System Offline";
    }

    /* ── Sliders ── */
    var sendTimers = {}, lastSent = {};
    function throttledSend(key, value) {
        var now = Date.now(), wait = 60;
        clearTimeout(sendTimers[key]);
        if (now - (lastSent[key] || 0) >= wait) {
            lastSent[key] = now;
            send(key, value);
        } else {
            sendTimers[key] = setTimeout(function () {
                lastSent[key] = Date.now();
                send(key, value);
            }, wait);
        }
    }

    function zoneOf(v) {
        if (v <= 85)  return { name: "Low",    cls: "zone-low",  type: "gold" };
        if (v <= 170) return { name: "Medium", cls: "zone-mid",  type: "gold" };
        return              { name: "High",   cls: "zone-high", type: "ember" };
    }

    function paintSlider(id, value) {
        var s = $(id);
        if (!s) return;
        s.value = value;
        var min = s.min !== undefined && s.min !== "" ? parseFloat(s.min) : 0;
        var max = s.max !== undefined && s.max !== "" ? parseFloat(s.max) : 100;
        s.style.setProperty("--fill", ((value - min) / (max - min)) * 100 + "%");
        var label = $(id + "Value");
        if (label) {
            label.textContent = DEG_KEYS.indexOf(id) !== -1 ? value + "\u00B0" : String(value);
            if (id === "Speed") {
                var z = zoneOf(value);
                ["zone-low", "zone-mid", "zone-high"].forEach(function (c) {
                    s.classList.remove(c); label.classList.remove(c);
                });
                s.classList.add(z.cls); label.classList.add(z.cls);
            }
        }
    }

    function notifySlider(id, v) {
        var text, type = "gold";
        if (id === "Speed") {
            var z = zoneOf(v);
            text = "Speed " + v + " \u00B7 " + z.name;
            type = z.type;
        } else if (id === "Light") {
            text = v === 0 ? "Headlight OFF" : "Headlight " + v;
        } else {
            text = LABELS[id] + " " + v + "\u00B0";
        }
        notify(text, type, { key: "slider-" + id, ttl: 1800 });
    }

    /* ── Movement ── */
    var MOVE_CODE = { up: "1", down: "2", left: "3", right: "4" };

    function startMovement(dir) {
        if (currentMode !== "manual" || currentDirection === dir) return;
        if (!requireConn("Not connected - movement not sent")) return;
        stopMovement(true);
        currentDirection = dir;
        var btn = $(dir + "Button");
        if (btn) btn.classList.add("active", dir + "-active");
        send("MoveCar", MOVE_CODE[dir]);
        notify(DIR_TEXT[dir], "gold", { key: "move", sticky: true });
    }
    function stopMovementLocal() {
        if (currentDirection) {
            var btn = $(currentDirection + "Button");
            if (btn) btn.classList.remove("active", "up-active", "down-active", "left-active", "right-active");
            currentDirection = null;
        }
    }
    function stopMovement(silent) {
        if (currentDirection) {
            stopMovementLocal();
            send("MoveCar", "0");
            if (!silent) notify("Stopped", "gold", { key: "move", ttl: 1200 });
        }
    }
    function stopCar() { stopMovementLocal(); send("MoveCar", "0"); }

    function userStop() {
        stopCar();
        notify("Stopped", "gold", { key: "move", ttl: 1200 });
    }
    function failsafeStop(reason) {
        if (currentDirection) {
            stopCar();
            notify("Rover stopped - " + reason, "warn", { key: "move", ttl: 3000 });
        } else {
            stopCar();
        }
    }

    function bindDpad() {
        ["up", "down", "left", "right"].forEach(function (dir) {
            var btn = $(dir + "Button");
            if (!btn) return;
            btn.addEventListener("pointerdown", function (e) {
                e.preventDefault();
                try { btn.setPointerCapture(e.pointerId); } catch (err) {}
                startMovement(dir);
            });
            var release = function () { if (currentDirection === dir) stopMovement(); };
            btn.addEventListener("pointerup", release);
            btn.addEventListener("pointercancel", release);
            btn.addEventListener("lostpointercapture", release);
            btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
        });
        var stopBtn = $("stopButton");
        if (stopBtn) {
            stopBtn.addEventListener("pointerdown", function (e) {
                e.preventDefault();
                userStop();
            });
        }
    }

    /* ── Relays & TP3110 Sonic Wave Cannon ── */
    function refreshRelayUI() {
        var water = $("Relay"), sonic = $("Relay2");
        var w = water ? water.checked : false;
        var s = sonic ? sonic.checked : false;

        var rs = $("RelayStatus"); if (rs) rs.textContent  = w ? "ON" : "OFF";
        var r2s = $("Relay2Status"); if (r2s) r2s.textContent = s ? "ON" : "OFF";

        var wr = $("waterRow"); if (wr) wr.classList.toggle("water-on", w);
        var sr = $("sonicRow"); if (sr) sr.classList.toggle("sonic-on", s);
        var rc = $("relayControl");
        if (rc) {
            rc.classList.toggle("firing-water", w);
            rc.classList.toggle("firing-sonic", s);
        }
    }

    function handleWater(state) {
        if (state && !requireConn("Not connected - Water Cannon not started")) {
            var water = $("Relay"); if (water) water.checked = false;
            refreshRelayUI();
            return;
        }
        send("Relay", state ? "1" : "0");
        refreshRelayUI();
        notify(state ? "Water Cannon ON (Relay 16)" : "Water Cannon OFF", state ? "water" : "gold",
               { key: "water", ttl: state ? 3000 : 2000 });
    }

    function handleSonic(state) {
        if (state && !requireConn("Not connected - Sonic Wave Cannon not started")) {
            var sonic = $("Relay2"); if (sonic) sonic.checked = false;
            refreshRelayUI();
            return;
        }
        send("Relay2", state ? "1" : "0");
        refreshRelayUI();
        notify(state ? "TP3110 Sonic Wave ACTIVE (GPIO 26 DAC2)" : "TP3110 Sonic Wave OFF", state ? "sonic" : "gold",
               { key: "sonic", ttl: state ? 3000 : 2000 });
    }

    function bindLockedNotice() {
        [["Relay", "Turn off Sonic Wave Cannon first"], ["Relay2", "Turn off Water Cannon first"]].forEach(function (p) {
            var input = $(p[0]);
            if (input && input.parentNode) {
                input.parentNode.addEventListener("click", function () {
                    if (input.disabled) notify(p[1], "warn", { key: "lock" });
                });
            }
        });
    }

    /* ── Auto sweep ── */
    function startAutoSweep() {
        stopAutoSweep();
        panValue = parseInt($("Pan") ? $("Pan").value : 15, 10) || 15;
        camTiltValue = parseInt($("CamTilt") ? $("CamTilt").value : 106, 10) || 106;
        sweepInterval = setInterval(function () {
            panValue += panDir * SWEEP_STEP;
            if (panValue >= 165) { panValue = 165; panDir = -1; }
            if (panValue <= 15)  { panValue = 15;  panDir =  1; }
            paintSlider("Pan", panValue);
            send("Pan", panValue);

            camTiltValue += camTiltDir * SWEEP_STEP;
            if (camTiltValue >= 140) { camTiltValue = 140; camTiltDir = -1; }
            if (camTiltValue <= 70)  { camTiltValue = 70;  camTiltDir =  1; }
            paintSlider("CamTilt", camTiltValue);
            send("CamTilt", camTiltValue);
        }, SWEEP_DELAY);
    }
    function stopAutoSweep() {
        if (sweepInterval) { clearInterval(sweepInterval); sweepInterval = null; }
    }

    /* ── Mode ── */
    window.setMode = function (mode, silent) {
        if (!silent && mode === currentMode) return;
        var previous = currentMode;
        currentMode = mode;
        var auto = mode === "auto";

        var mb = $("manualModeBtn"); if (mb) mb.classList.toggle("active", !auto);
        var ab = $("autoModeBtn"); if (ab) ab.classList.toggle("active", auto);
        var mc = $("mainContent"); if (mc) mc.classList.toggle("auto-mode", auto);

        ["movementControls", "relayControl", "wDirectionControl", "speedControl", "lightControl"].forEach(function (id) {
            var el = $(id); if (el) el.classList.toggle("hidden", auto);
        });
        ["Pan", "CamTilt"].forEach(function (id) {
            var el = $(id); if (el) el.disabled = auto;
        });

        var connSuffix = isOpen() ? "" : " (applies on reconnect)";

        if (auto) {
            var r1 = $("Relay"), r2 = $("Relay2");
            var cannonsWereOn = (r1 && r1.checked) || (r2 && r2.checked);
            stopCar();
            if (r1 && r1.checked) { r1.checked = false; send("Relay", "0"); }
            if (r2 && r2.checked) { r2.checked = false; send("Relay2", "0"); }
            refreshRelayUI();
            send("AMRelay", "1");
            startAutoSweep();

            if (!silent) {
                var cannonPart = cannonsWereOn ? "cannons off \u00B7 " : "";
                var msg = "Auto mode \u00B7 " + cannonPart + "camera sweep active" + connSuffix;
                notify(msg, "gold", { key: "mode" });
            }
        } else {
            stopAutoSweep();
            send("AMRelay", "0");

            if (!silent) {
                var sweepPart = previous === "auto" ? " \u00B7 camera sweep off" : "";
                var msg = "Manual mode" + sweepPart + connSuffix;
                notify(msg, "gold", { key: "mode" });
            }
        }
    };

    /* ── Keyboard ── */
    var KEY_DIR = {
        ArrowUp: "up", w: "up", W: "up",
        ArrowDown: "down", s: "down", S: "down",
        ArrowLeft: "left", a: "left", A: "left",
        ArrowRight: "right", d: "right", D: "right"
    };
    window.addEventListener("keydown", function (e) {
        if (currentMode !== "manual") return;
        var isArrow = e.key && e.key.indexOf("Arrow") === 0;
        if (isArrow && e.target && e.target.type === "range") return;
        if (isArrow || (e.key === " ")) e.preventDefault();
        if (e.repeat) return;
        if (KEY_DIR[e.key]) startMovement(KEY_DIR[e.key]);
        else if (e.key === " " || e.key === "Escape") userStop();
    });
    window.addEventListener("keyup", function (e) {
        if (currentMode !== "manual") return;
        if (KEY_DIR[e.key] && KEY_DIR[e.key] === currentDirection) stopMovement();
    });

    /* ── Failsafes & Outside Clicks ── */
    window.addEventListener("blur", function () { failsafeStop("window lost focus"); });
    document.addEventListener("visibilitychange", function () { if (document.hidden) failsafeStop("page hidden"); });
    window.addEventListener("pagehide", stopCar);

    document.addEventListener("click", function (e) {
        var wrapper = $("notifWrapper");
        if (wrapper && !wrapper.contains(e.target)) {
            toggleHistory(false);
        }
    });

    window.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            toggleHistory(false);
        }
    });

    /* ── Expose Programmatic / Test Control Helpers on window ── */
    window.startMovement = startMovement;
    window.stopMovement = stopMovement;
    window.stopCar = stopCar;
    window.handleWater = handleWater;
    window.handleSonic = handleSonic;
    window.toggleWater = function () {
        var el = $("Relay");
        if (el) { el.checked = !el.checked; handleWater(el.checked); }
    };
    window.toggleSonic = function () {
        var el = $("Relay2");
        if (el) { el.checked = !el.checked; handleSonic(el.checked); }
    };
    window.updateSliderValue = function (id, val) {
        paintSlider(id, val);
        send(id, val);
        notifySlider(id, val);
    };
    window.setSpeedPreset = function (val) {
        window.updateSliderValue("Speed", val);
    };
    window.setLightPreset = function (val) {
        window.updateSliderValue("Light", val);
    };
    window.toggleHistory = toggleHistory;
    window.clearHistory = clearHistory;
    window.notify = notify;
    window.initWebSocket = connect;

    /* ── Init ── */
    window.addEventListener("load", function () {
        SLIDERS.forEach(function (id) {
            var s = $(id);
            if (!s) return;
            paintSlider(id, parseInt(s.value, 10));
            s.addEventListener("input", function () {
                var v = parseInt(s.value, 10);
                paintSlider(id, v);
                if (!requireConn("Not connected - setting applies on reconnect")) return;
                throttledSend(id, v);
                notifySlider(id, v);
            });
        });
        bindDpad();
        var r1 = $("Relay"), r2 = $("Relay2");
        if (r1) r1.addEventListener("change", function () { handleWater(this.checked); });
        if (r2) r2.addEventListener("change", function () { handleSonic(this.checked); });
        refreshRelayUI();

        var notifBar = $("notifBar");
        if (notifBar) {
            notifBar.addEventListener("click", function (e) {
                toggleHistory();
            });
        }
        var clearBtn = $("notifClearBtn");
        if (clearBtn) {
            clearBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                clearHistory();
            });
        }

        window.setMode("manual", true);
        setBarVisual("System ready", "idle");
        connect();
    });
})();
</script>
</body>
</html>)HTMLHOMEPAGE";

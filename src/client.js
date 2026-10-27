/**
 * dsh-fish-pet — big fat fish desktop pet, browser half.
 *
 * A frame-wide overlay occupant (`shell.overlay`): one character sits on the
 * page, greets you when the app opens, talks when poked, can be dragged
 * anywhere, naps when you leave it alone, and has a small right-click menu.
 *
 * Built from src/client.js + art/pet.webp by scripts/build-client.py — edit
 * this file, then rerun the build script; never hand-edit client.js.
 */
window.__ModuleLoader__.load({
  id: 'dsh-fish-pet',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useRef, useState } = React

    const NS = 'fish-pet'
    // Shown in the hover tooltip so you can tell which build the page runs.
    const BUILD = '0.3.1'
    const PET_IMG = '__PET_IMG__'

    // v3: the default corner moved back to the bottom-left, so an old saved
    // spot must not keep the pet up in the top-right.
    const KEY_POS = 'dsh-fish-pet:pos:3'
    const KEY_PREFS = 'dsh-fish-pet:prefs'

    const ZH = {
      'pet.label': '大肥鱼',
      'greet.morning': '早上好。今天也慢慢来。',
      'greet.noon': '下午好。我在这儿，有事喊我。',
      'greet.evening': '晚上好。今天辛苦了。',
      'greet.night': '这么晚了还不睡？我陪你一会儿。',
      'poke.1': '戳我做什么，我又不是按钮。……好吧，我确实是。',
      'poke.2': '在的。',
      'poke.3': '摸头可以，摸钱包不行。',
      'poke.4': '刚才在想事情，被你这么一戳，忘了。',
      'poke.5': '眼睛看累了吧？往远处看两秒。',
      'poke.6': '有话直说，我不咬人。',
      'poke.7': '这碗饭不太够。',
      'poke.8': '想看我花掉你多少钱？右下角那个就是我。',
      'poke.9': '别戳了，真的会痒。',
      'poke.wake': '唔……我醒着呢。',
      'poke.back': '我又游回来了。',
      'poke.dizzy': '转晕了……别这样。',
      'peek.found': '被发现了。',
      'peek.hint': '点一下，我出来',
      'idle.1': '……',
      'idle.2': '水面挺安静的。',
      'idle.3': '你刚才那行，写完了吗？',
      'idle.4': '我在发呆，别管我。',
      'idle.5': '要不要起来走两步？',
      'idle.6': '嗯？没叫你。',
      'idle.7': '（扒饭）',
      'menu.talk': '说句话',
      'menu.chattyOff': '安静一点',
      'menu.chattyOn': '可以念叨了',
      'menu.sleep': '睡一会儿',
      'menu.wake': '醒醒',
      'menu.corner': '回到角落',
      'menu.hide': '藏起来',
    }

    const EN = {
      'pet.label': 'Big Fat Fish',
      'greet.morning': 'Morning. No rush today.',
      'greet.noon': 'Afternoon. I am right here if you need me.',
      'greet.evening': 'Evening. You did enough today.',
      'greet.night': 'Still up? I will keep you company.',
      'poke.1': 'Why poke me? I am not a button. ...Fine, I am.',
      'poke.2': 'Here.',
      'poke.3': 'Head pats are fine. Wallet pokes are not.',
      'poke.4': 'I was thinking about something. Now it is gone.',
      'poke.5': 'Eyes tired? Look far away for two seconds.',
      'poke.6': 'Just say it. I do not bite.',
      'poke.7': 'This bowl is not enough.',
      'poke.8': 'Want to see what you spend? That thing bottom-right is me.',
      'poke.9': 'Stop poking, it tickles.',
      'poke.wake': 'Hm... I am awake.',
      'poke.back': 'I swam back.',
      'poke.dizzy': 'Dizzy... easy.',
      'peek.found': 'You found me.',
      'peek.hint': 'Click, I will come out',
      'idle.1': '...',
      'idle.2': 'Quiet water.',
      'idle.3': 'Did you finish that line?',
      'idle.4': 'Spacing out. Ignore me.',
      'idle.5': 'Maybe stand up for a minute?',
      'idle.6': 'Hm? Not you.',
      'idle.7': '(munching)',
      'menu.talk': 'Say something',
      'menu.chattyOff': 'Quieter',
      'menu.chattyOn': 'You can mutter',
      'menu.sleep': 'Nap',
      'menu.wake': 'Wake up',
      'menu.corner': 'Back to corner',
      'menu.hide': 'Hide',
    }

    const POKE_KEYS = ['poke.1', 'poke.2', 'poke.3', 'poke.4', 'poke.5', 'poke.6', 'poke.7', 'poke.8', 'poke.dizzy']
    const IDLE_KEYS = ['idle.1', 'idle.2', 'idle.3', 'idle.4', 'idle.5', 'idle.6', 'idle.7']

    const PET_W = 152
    const PET_H = Math.round((PET_W * 440) / 397)
    const CORNER_LEFT = 24
    const CORNER_BOTTOM = 28
    const TICK_MS = 15000
    const IDLE_NAP_MS = 210000
    const IDLE_TALK_MS = 45000

    // The pet greets once per page load, not on every remount of the overlay.
    let greeted = false
    let locale = null

    const pick = (list) => list[Math.floor(Math.random() * list.length) % list.length]
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

    function readJSON(key) {
      try {
        const raw = window.localStorage.getItem(key)
        return raw ? JSON.parse(raw) : null
      } catch (err) {
        return null
      }
    }
    function writeJSON(key, value) {
      try {
        if (value == null) window.localStorage.removeItem(key)
        else window.localStorage.setItem(key, JSON.stringify(value))
      } catch (err) {
        /* private mode: the pet still works, it just forgets */
      }
    }

    function loadPos() {
      const saved = readJSON(KEY_POS)
      if (!saved || !Number.isFinite(saved.left) || !Number.isFinite(saved.top)) return null
      // Never restore a position that is mostly off screen: a pet parked at the
      // edge would look like it disappeared.
      return {
        left: clamp(saved.left, 4, window.innerWidth - 64),
        top: clamp(saved.top, 4, window.innerHeight - 64),
      }
    }

    function readPref(name, fallback) {
      const prefs = readJSON(KEY_PREFS) || {}
      return typeof prefs[name] === 'boolean' ? prefs[name] : fallback
    }

    function writePref(name, value) {
      const prefs = readJSON(KEY_PREFS) || {}
      prefs[name] = value
      writeJSON(KEY_PREFS, prefs)
    }

    function greetingKey() {
      const hour = new Date().getHours()
      if (hour < 5) return 'greet.night'
      if (hour < 11) return 'greet.morning'
      if (hour < 18) return 'greet.noon'
      if (hour < 23) return 'greet.evening'
      return 'greet.night'
    }

    const CSS = `
.dfp-root{position:fixed;z-index:2147483000;width:${PET_W}px;pointer-events:none;user-select:none;-webkit-user-select:none;font-family:inherit;line-height:1.5;}
.dfp-root[data-hidden="true"]{width:auto;}
.dfp-root[data-slide="true"]{transition:left .5s cubic-bezier(.33,.9,.32,1),top .5s cubic-bezier(.33,.9,.32,1);}
.dfp-root[data-lie="true"] .dfp-sway{animation:none;}
.dfp-root[data-lie="true"] .dfp-shadow{width:118px;margin-left:-59px;opacity:.42;animation:none;}
.dfp-stage{position:relative;pointer-events:auto;cursor:grab;touch-action:none;}
.dfp-stage:active{cursor:grabbing;}
.dfp-sway{animation:dfp-bob 4.6s ease-in-out infinite;will-change:transform;}
.dfp-root[data-sleep="true"] .dfp-sway{animation-duration:8.5s;}
.dfp-tilt{transition:transform .25s ease-out;transform-origin:50% 86%;}
.dfp-flip{transition:transform .45s cubic-bezier(.34,1.2,.4,1);transform-origin:50% 50%;}
.dfp-img{display:block;width:${PET_W}px;height:auto;pointer-events:none;-webkit-user-drag:none;
  filter:drop-shadow(0 8px 12px rgba(15,23,42,.22));animation:dfp-arrive .55s cubic-bezier(.2,1.5,.4,1) both;}
.dfp-root[data-sleep="true"] .dfp-img{filter:drop-shadow(0 8px 12px rgba(15,23,42,.18)) saturate(.86);}
.dfp-shadow{position:absolute;left:50%;bottom:2px;width:86px;height:13px;margin-left:-43px;border-radius:50%;
  background:radial-gradient(ellipse at center,rgba(15,23,42,.30),rgba(15,23,42,0) 70%);
  animation:dfp-shadow 4.6s ease-in-out infinite;pointer-events:none;}
.dfp-bubble{position:absolute;left:50%;bottom:calc(100% + 10px);transform:translateX(-50%);max-width:190px;width:max-content;
  padding:8px 11px;border-radius:12px;background:#ffffff;color:#1c2333;
  border:1px solid rgba(28,40,70,.14);box-shadow:0 10px 26px rgba(15,23,42,.22);font-size:12.5px;
  text-align:left;pointer-events:none;animation:dfp-bubble-in .2s ease-out;z-index:3;}
.dfp-bubble::after{content:"";position:absolute;left:50%;bottom:-5px;width:9px;height:9px;margin-left:-4px;transform:rotate(45deg);
  background:#ffffff;border-right:1px solid rgba(28,40,70,.14);border-bottom:1px solid rgba(28,40,70,.14);}
.dfp-zzzbox{position:absolute;left:50%;bottom:calc(100% + 10px);transform:translateX(-50%);
  display:flex;align-items:flex-end;gap:1px;padding:3px 11px 5px;border-radius:12px;
  background:#ffffff;color:#41506b;border:1px solid rgba(28,40,70,.14);
  box-shadow:0 10px 26px rgba(15,23,42,.22);font-size:14px;letter-spacing:2px;
  pointer-events:none;z-index:3;animation:dfp-bubble-in .2s ease-out;}
.dfp-zzzbox span{display:inline-block;animation:dfp-float 2.6s ease-in-out infinite;}
.dfp-zzzbox span:nth-child(2){animation-delay:.35s;font-size:17px;}
.dfp-zzzbox span:nth-child(3){animation-delay:.7s;font-size:11px;}
.dfp-heart{position:absolute;left:50%;top:18%;font-size:14px;color:#ef7ba6;pointer-events:none;z-index:4;
  animation:dfp-heart .85s ease-out forwards;}
.dfp-menu{position:absolute;left:50%;transform:translateX(-50%);min-width:118px;padding:4px;border-radius:10px;
  background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);
  box-shadow:0 12px 30px rgba(15,23,42,.24);pointer-events:auto;display:flex;flex-direction:column;gap:1px;z-index:5;}
.dfp-menu[data-below="true"]{top:calc(100% + 8px);bottom:auto;}
.dfp-menu[data-below="false"]{bottom:calc(100% + 8px);}
.dfp-menu button{all:unset;box-sizing:border-box;cursor:pointer;padding:6px 9px;border-radius:6px;font-size:12px;
  color:var(--dsw-alias-label-primary);white-space:nowrap;text-align:left;transition:background .12s;}
.dfp-menu button:hover{background:var(--dsw-alias-bg-layer-2);}
.dfp-menu button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px;}
@keyframes dfp-bob{0%,100%{transform:translateY(0) rotate(-1.1deg)}50%{transform:translateY(-6px) rotate(1.1deg)}}
@keyframes dfp-shadow{0%,100%{transform:scaleX(1);opacity:.9}50%{transform:scaleX(.86);opacity:.62}}
@keyframes dfp-arrive{from{opacity:0;transform:translateY(14px) scale(.86)}to{opacity:1;transform:none}}
@keyframes dfp-bubble-in{from{opacity:0;transform:translateX(-50%) translateY(5px) scale(.96)}to{opacity:1;transform:translateX(-50%)}}
@keyframes dfp-float{0%,100%{transform:translateY(0);opacity:.35}50%{transform:translateY(-5px);opacity:.95}}
@keyframes dfp-heart{0%{opacity:0;transform:translate(-50%,0) scale(.6)}25%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),-34px) scale(1.1)}}
@media (prefers-reduced-motion: reduce){
  .dfp-sway,.dfp-shadow,.dfp-img,.dfp-zzzbox span,.dfp-heart{animation:none !important;}
  .dfp-flip{transition:none;}
}
`

    // Turns a render crash into a visible red strip with the message instead of
    // a silently empty slot.
    class PetBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: '' }
      }
      static getDerivedStateFromError(error) {
        return { error: String((error && error.message) || error) }
      }
      render() {
        if (!this.state.error) return this.props.children
        return h('div', {
          style: {
            position: 'fixed', top: '34px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 2147483000, maxWidth: '70vw', background: '#b3261e', color: '#fff',
            fontSize: '12px', padding: '6px 12px', borderRadius: '8px', fontFamily: 'monospace',
          },
        }, 'fish-pet 渲染出错：' + this.state.error)
      }
    }

    function Pet() {
      const t = useCallback((key) => (locale ? locale.bind(NS)(key) : key), [])
      const [, setLocaleRev] = useState(0)

      useEffect(() => {
        if (!locale) return undefined
        return locale.subscribe(() => setLocaleRev((n) => n + 1))
      }, [])

      const [pos, setPos] = useState(loadPos)
      const [say, setSay] = useState(null)
      const [sleeping, setSleeping] = useState(false)
      const [chatty, setChatty] = useState(() => readPref('chatty', true))
      const [peek, setPeek] = useState(false)
      const [slide, setSlide] = useState(false)
      const [menu, setMenu] = useState(null)
      const [tilt, setTilt] = useState(0)
      const [hearts, setHearts] = useState([])
      const [vpW, setVpW] = useState(() => window.innerWidth)

      const rootRef = useRef(null)
      const stageRef = useRef(null)
      const dragRef = useRef(null)
      const sayTimer = useRef(0)
      const slideTimer = useRef(0)
      const lastTouch = useRef(Date.now())
      const pokeCount = useRef(0)
      const heartId = useRef(0)
      const sleepingRef = useRef(false)
      const peekRef = useRef(false)
      const chattyRef = useRef(chatty)
      const posRef = useRef(pos)

      useEffect(() => { sleepingRef.current = sleeping }, [sleeping])
      useEffect(() => { peekRef.current = peek }, [peek])
      useEffect(() => { chattyRef.current = chatty }, [chatty])
      useEffect(() => { posRef.current = pos }, [pos])

      const sayLine = useCallback((text, holdMs) => {
        if (!text) return
        window.clearTimeout(sayTimer.current)
        setSay({ text, id: Date.now() + Math.random() })
        sayTimer.current = window.setTimeout(() => setSay(null), holdMs || 4600)
      }, [])

      const bounce = useCallback((keyframes, options) => {
        const el = stageRef.current
        if (!el || typeof el.animate !== 'function') return
        try { el.animate(keyframes, options) } catch (err) { /* older engine: skip */ }
      }, [])

      // Greeting on app open, once per page load.
      useEffect(() => {
        const timer = window.setTimeout(() => {
          if (greeted) return
          greeted = true
          sayLine(t(greetingKey()))
        }, 600)
        return () => window.clearTimeout(timer)
      }, [sayLine, t])

      // Idle life: mutter now and then, nap when nobody is around.
      useEffect(() => {
        const timer = window.setInterval(() => {
          if (peekRef.current) return
          const quietFor = Date.now() - lastTouch.current
          if (quietFor > IDLE_NAP_MS) {
            if (!sleepingRef.current) setSleeping(true)
            return
          }
          if (sleepingRef.current) return
          if (!chattyRef.current) return
          if (quietFor > IDLE_TALK_MS && Math.random() < 0.4) sayLine(t(pick(IDLE_KEYS)))
        }, TICK_MS)
        return () => window.clearInterval(timer)
      }, [sayLine, t])

      useEffect(() => () => {
        window.clearTimeout(sayTimer.current)
        window.clearTimeout(slideTimer.current)
      }, [])

      // Keep the pet on screen when the window shrinks.
      useEffect(() => {
        const onResize = () => {
          setVpW(window.innerWidth)
          if (!posRef.current) return
          const next = {
            left: clamp(posRef.current.left, -40, window.innerWidth - 60),
            top: clamp(posRef.current.top, 0, window.innerHeight - 60),
          }
          setPos(next)
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
      }, [])

      // Menu dismissal.
      useEffect(() => {
        if (!menu) return undefined
        const onDown = (event) => {
          if (rootRef.current && rootRef.current.contains(event.target)) return
          setMenu(null)
        }
        const onKey = (event) => { if (event.key === 'Escape') setMenu(null) }
        window.addEventListener('pointerdown', onDown, true)
        window.addEventListener('keydown', onKey)
        return () => {
          window.removeEventListener('pointerdown', onDown, true)
          window.removeEventListener('keydown', onKey)
        }
      }, [menu])

      const spawnHearts = useCallback(() => {
        const born = [0, 1, 2].map((i) => ({ id: (heartId.current += 1), dx: (i - 1) * 16 + (Math.random() * 8 - 4) }))
        setHearts((current) => current.concat(born))
        window.setTimeout(() => {
          setHearts((current) => current.filter((item) => !born.some((b) => b.id === item.id)))
        }, 900)
      }, [])

      const poke = useCallback(() => {
        lastTouch.current = Date.now()
        setMenu(null)
        if (peek) {
          slideTo(() => setPeek(false))
          sayLine(t('peek.found'), 3200)
          return
        }
        if (sleepingRef.current) {
          setSleeping(false)
          sayLine(t('poke.wake'))
          return
        }
        pokeCount.current += 1
        bounce(
          [
            { transform: 'scale(1,1)' },
            { transform: 'scale(1.06,.92)' },
            { transform: 'scale(.97,1.03)' },
            { transform: 'scale(1,1)' },
          ],
          { duration: 420, easing: 'ease-out' },
        )
        spawnHearts()
        if (pokeCount.current % 6 === 0) sayLine(t('poke.9'))
        else sayLine(t(pick(POKE_KEYS)))
      }, [bounce, peek, sayLine, spawnHearts, t])

      const toggleChatty = () => {
        const next = !chatty
        setChatty(next)
        writePref('chatty', next)
        sayLine(t(next ? 'menu.chattyOn' : 'menu.chattyOff'), 2400)
      }

      const toggleSleep = () => {
        const next = !sleeping
        setSleeping(next)
        lastTouch.current = Date.now()
        if (next) setSay(null)
        else sayLine(t('poke.wake'), 2600)
      }

      const slideTo = (apply) => {
        setSlide(true)
        apply()
        window.clearTimeout(slideTimer.current)
        slideTimer.current = window.setTimeout(() => setSlide(false), 620)
      }

      const resetCorner = () => {
        const next = {
          left: CORNER_LEFT,
          top: Math.max(8, window.innerHeight - PET_H - CORNER_BOTTOM),
        }
        slideTo(() => {
          setPeek(false)
          setPos(next)
        })
        writeJSON(KEY_POS, next)
        sayLine(t('poke.back'), 2600)
      }

      const hideToPeek = () => {
        setMenu(null)
        setSay(null)
        setSleeping(false)
        slideTo(() => setPeek(true))
      }

      const openMenu = (event) => {
        event.preventDefault()
        if (peek) return
        const rect = stageRef.current ? stageRef.current.getBoundingClientRect() : null
        const below = rect ? rect.top < 230 : false
        setMenu({ below })
        lastTouch.current = Date.now()
      }

      const onPointerDown = (event) => {
        if (event.button !== 0 || !stageRef.current) return
        // A click on the context menu is a menu click, not a drag: capturing the
        // pointer here would retarget the following `click` to the stage and the
        // menu button would never fire.
        const target = event.target
        if (target && target.closest && target.closest('.dfp-menu')) return
        lastTouch.current = Date.now()
        if (sleepingRef.current) setSleeping(false)
        const rect = rootRef.current.getBoundingClientRect()
        dragRef.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false }
        try { event.currentTarget.setPointerCapture(event.pointerId) } catch (err) { /* ignore */ }
      }

      const onPointerMove = (event) => {
        if (peek) return
        const drag = dragRef.current
        if (!drag) {
          const el = stageRef.current
          if (!el) return
          const rect = el.getBoundingClientRect()
          const rel = (event.clientX - (rect.left + rect.width / 2)) / Math.max(1, rect.width / 2)
          setTilt(clamp(rel, -1, 1) * 5.5)
          return
        }
        const dx = event.clientX - drag.x
        const dy = event.clientY - drag.y
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 5) return
        drag.moved = true
        setPos({
          left: clamp(drag.left + dx, -PET_W + 48, window.innerWidth - 48),
          top: clamp(drag.top + dy, 0, window.innerHeight - 48),
        })
      }

      const onPointerUp = (event) => {
        const drag = dragRef.current
        dragRef.current = null
        if (!drag) return
        try { event.currentTarget.releasePointerCapture(event.pointerId) } catch (err) { /* ignore */ }
        lastTouch.current = Date.now()
        if (peek) {
          slideTo(() => setPeek(false))
          sayLine(t('peek.found'), 3200)
          return
        }
        if (drag.moved) {
          setPos((current) => {
            if (current) writeJSON(KEY_POS, current)
            return current
          })
        } else if (event.button === 0) {
          poke()
        }
      }

      const onKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          poke()
        }
      }

      // Default spot: the bottom-left corner, next to the sidebar.
      const restingStyle = pos
        ? { left: pos.left, top: pos.top }
        : { left: CORNER_LEFT, bottom: CORNER_BOTTOM }
      // The drawing faces slightly left; on the left half of the window it
      // turns around so it always looks toward the middle of the page.
      const anchorLeft = pos ? pos.left : CORNER_LEFT
      const facingRight = anchorLeft + PET_W / 2 < vpW / 2
      // Peeking: slide to the nearer screen edge and leave half a body out.
      const peekLeft = facingRight ? -PET_W * 0.46 : vpW - PET_W * 0.54
      const rootStyle = peek
        ? (pos ? { left: peekLeft, top: pos.top } : { left: peekLeft, bottom: CORNER_BOTTOM })
        : restingStyle
      const flip = {
        transform: (sleeping ? 'translateY(26px) rotate(-82deg) ' : '')
          + (facingRight ? 'scaleX(-1)' : 'scaleX(1)'),
      }

      const body = h('div', {
        ref: rootRef,
        className: 'dfp-root',
        style: rootStyle,
        'data-sleep': sleeping ? 'true' : 'false',
        'data-lie': sleeping ? 'true' : 'false',
        'data-slide': slide ? 'true' : 'false',
        'data-peek': peek ? 'true' : 'false',
      },
      say && !peek ? h('div', { className: 'dfp-bubble', key: say.id }, say.text) : null,
      h('div', {
        ref: stageRef,
        className: 'dfp-stage',
        role: 'button',
        tabIndex: 0,
        'aria-label': t('pet.label'),
        title: peek ? t('peek.hint') : t('pet.label') + ' · v' + BUILD,
        onPointerDown,
        onPointerMove,
        onPointerLeave: () => setTilt(0),
        onPointerUp,
        onPointerCancel: () => { dragRef.current = null },
        onContextMenu: openMenu,
        onKeyDown,
      },
      h('div', { className: 'dfp-sway' },
        h('div', { className: 'dfp-tilt', style: { transform: 'rotate(' + tilt.toFixed(2) + 'deg)' } },
          h('div', { className: 'dfp-flip', style: flip },
            h('img', { className: 'dfp-img', src: PET_IMG, alt: '', draggable: false }),
          ),
        ),
      ),
      h('div', { className: 'dfp-shadow' }),
      sleeping ? h('div', { className: 'dfp-zzzbox' }, h('span', null, 'z'), h('span', null, 'z'), h('span', null, 'z')) : null,
      hearts.map((item) => h('span', {
        key: item.id,
        className: 'dfp-heart',
        style: { '--dx': item.dx + 'px' },
      }, '♥')),
      menu ? h('div', { className: 'dfp-menu', 'data-below': menu.below ? 'true' : 'false' },
        h('button', { type: 'button', onClick: () => { setMenu(null); lastTouch.current = Date.now(); sayLine(t(pick(POKE_KEYS)), 6000) } }, t('menu.talk')),
        h('button', { type: 'button', onClick: () => { setMenu(null); toggleChatty() } }, t(chatty ? 'menu.chattyOff' : 'menu.chattyOn')),
        h('button', { type: 'button', onClick: () => { setMenu(null); toggleSleep() } }, t(sleeping ? 'menu.wake' : 'menu.sleep')),
        h('button', { type: 'button', onClick: () => { setMenu(null); resetCorner() } }, t('menu.corner')),
        h('button', { type: 'button', onClick: () => hideToPeek() }, t('menu.hide')),
      ) : null,
      ),
      )

      return h(React.Fragment, null, h('style', { key: 'dfp-css' }, CSS), body)
    }

    return {
      name: 'dsh-fish-pet',
      inject: ['slots', 'locale'],
      apply(ctx) {
        locale = ctx.locale
        ctx.effect(() => {
          const disposers = [ctx.locale.register(NS, 'zh', ZH), ctx.locale.register(NS, 'en', EN)]
          return () => { for (const dispose of disposers) dispose() }
        })
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'fish-pet',
          order: 40,
          label: () => (locale ? locale.bind(NS)('pet.label') : 'fish'),
        }, () => h(PetBoundary, null, h(Pet))))
      },
    }
  },
})

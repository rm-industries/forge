# Accessibility review checklist

Use this checklist when changing the Forge project website's content,
navigation, themes, components, or interactive behavior. Record the review date,
browser, viewport, input methods, results, and linked issues in the change's
review evidence. The inherited template review is not evidence for this website.

## Manual checks

- [ ] Keyboard order starts with the skip link and then follows the visible
      page order without trapping focus.
- [ ] Every interactive element displays a visible focus indicator in light
      and dark modes.
- [ ] Activating **Skip to content** moves focus to the single main landmark.
- [ ] Text, controls, focus indicators, and linked text remain distinguishable
      in the default Latte and Mocha themes.
- [ ] Reduced-motion preference removes smooth scrolling and shortens CSS
      animations and transitions.
- [ ] Representative pages contain one descriptive level-one heading and do
      not skip heading levels.
- [ ] Public pages expose a banner, named primary navigation, one main landmark,
      and a content information landmark.
- [ ] Desktop and mobile navigation remain operable using only the keyboard.
- [ ] The custom 404 page identifies the error and provides a clear route home.

## Automated companion checks

Run `npm run test:a11y` after each manual review. The suite applies axe-core's
WCAG 2.0, 2.1, and 2.2 A/AA rules to representative public routes in both
default color schemes. It also asserts landmarks, level-one headings, skip-link
behavior, responsive overflow, current-page navigation, and reduced motion.
Serious or critical axe violations block the browser-test job.

Automated checks do not replace judgment about reading order, wording, focus
order, contrast in newly introduced states, or whether alternative text conveys
the intended meaning. Record any failure as a linked release-blocking issue
rather than checking off an unverified item.

import assembly from "./assembly.svg?raw";

export default function ({ root }) {
  const svg = new DOMParser().parseFromString(assembly, "image/svg+xml").documentElement;
  svg.style.cssText = "display:block;width:100%;height:100%";
  svg.classList.add("timeline");
  root.append(svg);
  const animations = svg.getAnimations({ subtree: true });
  for (const animation of animations) animation.pause();
  return {
    prepareFrame(time) {
      for (const animation of animations) animation.currentTime = time * 1000;
    },
    dispose() {
      svg.remove();
    },
  };
}

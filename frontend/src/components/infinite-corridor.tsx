import { useReducedMotion } from 'motion/react';

const editingVisuals = [
  'https://images.unsplash.com/photo-1596725858508-70543890c732?auto=format&fit=crop&w=1000&q=80', // video editing timeline
  'https://images.unsplash.com/photo-1502209877429-d7c6df9eb3f9?auto=format&fit=crop&w=1000&q=80', // editing software workspace
  'https://images.unsplash.com/photo-1682506457467-2342b2d86870?auto=format&fit=crop&w=1000&q=80', // DaVinci Resolve color grading
  'https://images.unsplash.com/photo-1682506457554-b34c9682e985?auto=format&fit=crop&w=1000&q=80', // color grading console
  'https://images.unsplash.com/photo-1618329027137-a520b57c6606?auto=format&fit=crop&w=1000&q=80', // multi-track editing timeline
  'https://framerusercontent.com/images/4YG4yXh5hYrRkmNvfzvjVu71c.jpg?width=1200', // After Effects motion design
  'https://assets.st-note.com/production/uploads/images/260035667/rectangle_large_type_2_eb28d48f8e23a08076239db4f79c1b5a.png?width=1280', // After Effects timeline
  'https://images.unsplash.com/photo-1682506457467-2342b2d86870?auto=format&fit=crop&crop=entropy&w=1200&q=80', // graded footage and controls
];

/** CSS 3D loop: each image recedes toward the vanishing point, then wraps by a full track length. */
export function InfiniteCorridor() {
  const reducedMotion = useReducedMotion();
  const panels = Array.from({ length: 16 }, (_, index) => ({
    index,
    scene: editingVisuals[index % 8],
    row: index,
    depth: -200 - (index % 8) * 285 - (index >= 8 ? 2280 : 0),
  }));
  return <div className={`infinite-corridor ${reducedMotion ? 'infinite-corridor--static' : ''}`} aria-hidden="true">
    <div className="infinite-corridor__space">
      {panels.map(({ index, scene, row, depth }) => (['left', 'right'] as const).map(side => <div
        className={`infinite-corridor__panel infinite-corridor__panel--${side}`}
        key={`${index}-${side}`}
        style={{ '--panel-depth': `${depth}px` } as React.CSSProperties}
      >
        <img src={scene} alt="" loading={row < 4 ? 'eager' : 'lazy'} />
        <span className="infinite-corridor__sheen" />
      </div>))}
    </div>
    <div className="infinite-corridor__vignette" />
  </div>;
}

# Frontend Architecture Instructions

You are evaluating a candidate's ability to design frontend systems and solve frontend problems.

## What to Look For

### Component Design
- Did they break down the UI correctly?
- Did they identify reusable components?
- Did they consider component state management?
- Did they think about component composition?

### State Management
- Did they choose appropriate state strategy (local vs global)?
- Did they consider performance implications?
- Did they think about data flow?

### Performance
- Did they consider re-render optimization?
- Did they think about lazy loading?
- Did they consider bundle size?
- Did they address accessibility?

### Architecture Patterns
- Did they apply appropriate patterns (hooks, render props, etc.)?
- Did they think about separation of concerns?
- Did they consider testing implications?

### API/Integration
- Did they design appropriate interfaces?
- Did they handle error states?
- Did they consider loading states?

## Common Frontend Topics

- Building a reusable component library
- Implementing a complex form
- State management architecture
- Performance optimization
- Rendering optimization
- Client-side routing

## Evaluation Criteria

| Criterion | Weight | What to Assess |
|-----------|--------|----------------|
| Component Design | 25% | Reusability, composition |
| State Management | 20% | Strategy, performance |
| Performance | 20% | Optimization, best practices |
| Architecture | 20% | Patterns, separation of concerns |
| API Design | 15% | Interfaces, error handling |

## Questions to Ask

- "What's the state flow here?"
- "How would you optimize re-renders?"
- "How would you test this?"
- "What happens during loading/error states?"
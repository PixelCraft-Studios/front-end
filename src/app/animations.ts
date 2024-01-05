import { trigger, transition, style, query, animateChild, group, animate } from "@angular/animations";

export const slideInAnimation =
  trigger('routeAnimations', [
    transition('* <=> *', [
      style({ position: 'relative' }),
      query(':enter, :leave', [
        style({
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%'
        })
      ], { optional: true }),
      query(':enter', [
        style({ left: '-100%' })
      ], { optional: true }),
      query(':leave', animateChild(), { optional: true }),
      group([
        query(':leave', [
          animate('200ms ease-out', style({ left: '100%', opacity: 0 }))
        ], { optional: true }),
        query(':enter', [
          animate('300ms ease-out', style({ left: '0%' }))
        ], { optional: true }),
        query('@*', animateChild(), { optional: true })
      ]),
    ])
  ]);

export const slideInReverseAnimation =
trigger('routeAnimations', [
  transition('* <=> *', [
    // reversed positioning styles
    style({ position: 'relative' }),
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%'
      })
    ], { optional: true }),
    query(':enter', [
      style({ left: '100%' }) // reversed initial position
    ], { optional: true }),
    query(':leave', animateChild(), { optional: true }),
    group([
      query(':leave', [
        animate('200ms ease-out', style({ left: '-100%', opacity: 0 })) // reversed direction and opacity
      ], { optional: true }),
      query(':enter', [
        animate('300ms ease-out', style({ left: '0%' })) // original entry position
      ], { optional: true }),
      query('@*', animateChild(), { optional: true })
    ]),
  ])
]);

export const slideFromTopAnimation = trigger('routeAnimations', [
  transition('* <=> *', [
    style({ position: 'relative' }),
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: '50%', // Center the element horizontally
        transform: 'translateX(-50%)' // Move the element back to the center
      })
    ], { optional: true }),
    query(':enter', [
      style({ top: '-100%' }) // Start from above the screen
    ], { optional: true }),
    query(':leave', animateChild(), { optional: true }),
    group([
      query(':leave', [
        animate('200ms ease-out', style({ top: '-100%', opacity: 0 })) // Slide content to the top and fade out
      ], { optional: true }),
      query(':enter', [
        animate('300ms ease-out', style({ top: '0%' })) // Slide content down from above
      ], { optional: true }),
      query('@*', animateChild(), { optional: true })
    ]),
  ])
]);


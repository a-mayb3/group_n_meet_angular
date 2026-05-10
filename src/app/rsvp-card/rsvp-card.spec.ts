import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RsvpCard } from './rsvp-card';

describe('RsvpCard', () => {
  let component: RsvpCard;
  let fixture: ComponentFixture<RsvpCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RsvpCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RsvpCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

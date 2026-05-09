import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventResultCard } from './event-result-card';

describe('EventResultCard', () => {
  let component: EventResultCard;
  let fixture: ComponentFixture<EventResultCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventResultCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventResultCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

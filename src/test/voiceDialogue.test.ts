import { describe, it, expect } from 'vitest';
import { HeuristicEngine } from '../../server/services/heuristicEngine';

describe('HeuristicEngine Voice Dialogue', () => {
  const currentDate = '2026-09-27';
  const sampleProjects = [
    { id: 'inbox', name: 'Inbox' },
    { id: 'work', name: 'Work' },
    { id: 'personal', name: 'Personal' },
    { id: 'groceries', name: 'Groceries' },
  ];

  it('greets the user warmly when opening empty dialogue', () => {
    const res = HeuristicEngine.handleVoiceDialogue([], currentDate, sampleProjects);
    expect(res.isComplete).toBe(false);
    expect(res.action).toBe('chat');
    expect(res.reply).toContain('What can I help you add');
  });

  it('asks clarifying questions when title is provided without a due date', () => {
    const res = HeuristicEngine.handleVoiceDialogue(
      [{ role: 'user', content: 'I need to write documentation for the new API' }],
      currentDate,
      sampleProjects
    );

    expect(res.isComplete).toBe(false);
    expect(res.action).toBe('clarify');
    expect(res.extractedTask?.title).toContain('Write documentation for the new API');
    expect(res.reply).toContain('When would you like to get that done');
  });

  it('understands relative dates like tomorrow and day after tomorrow', () => {
    const resTomorrow = HeuristicEngine.handleVoiceDialogue(
      [{ role: 'user', content: 'Submit quarterly tax filing tomorrow' }],
      currentDate,
      sampleProjects
    );
    expect(resTomorrow.extractedTask?.dueDate).toBe('2026-09-28');

    const resDayAfter = HeuristicEngine.handleVoiceDialogue(
      [{ role: 'user', content: 'Oil change for car day after tomorrow' }],
      currentDate,
      sampleProjects
    );
    expect(resDayAfter.extractedTask?.dueDate).toBe('2026-09-29');
  });

  it('understands "in X days"', () => {
    const res = HeuristicEngine.handleVoiceDialogue(
      [{ role: 'user', content: 'Flight check-in in 3 days' }],
      currentDate,
      sampleProjects
    );
    expect(res.extractedTask?.dueDate).toBe('2026-09-30');
  });

  it('infers project matching and priority', () => {
    const res = HeuristicEngine.handleVoiceDialogue(
      [{ role: 'user', content: 'Urgent meeting with client tomorrow under Work' }],
      currentDate,
      sampleProjects
    );
    expect(res.extractedTask?.projectId).toBe('work');
    expect(res.extractedTask?.priority).toBe('high');
    expect(res.action).toBe('confirm');
    expect(res.reply).toContain('Shall I go ahead and add that');
  });

  it('handles multi-turn conversation from title to clarification to confirmation', () => {
    // Turn 1: User gives title
    const turn1 = HeuristicEngine.handleVoiceDialogue(
      [{ role: 'user', content: 'Buy fresh milk and eggs' }],
      currentDate,
      sampleProjects
    );
    expect(turn1.action).toBe('clarify');

    // Turn 2: User answers clarification with date and project
    const turn2 = HeuristicEngine.handleVoiceDialogue(
      [
        { role: 'user', content: 'Buy fresh milk and eggs' },
        { role: 'assistant', content: turn1.reply },
        { role: 'user', content: 'Tomorrow for Groceries list' },
      ],
      currentDate,
      sampleProjects
    );
    expect(turn2.action).toBe('confirm');
    expect(turn2.extractedTask?.projectId).toBe('groceries');
    expect(turn2.extractedTask?.dueDate).toBe('2026-09-28');

    // Turn 3: User confirms
    const turn3 = HeuristicEngine.handleVoiceDialogue(
      [
        { role: 'user', content: 'Buy fresh milk and eggs' },
        { role: 'assistant', content: turn1.reply },
        { role: 'user', content: 'Tomorrow for Groceries list' },
        { role: 'assistant', content: turn2.reply },
        { role: 'user', content: 'Sounds great, go ahead!' },
      ],
      currentDate,
      sampleProjects
    );
    expect(turn3.isComplete).toBe(true);
    expect(turn3.action).toBe('complete');
    expect(turn3.extractedTask?.title).toContain('Buy fresh milk and eggs');
    expect(turn3.extractedTask?.dueDate).toBe('2026-09-28');
    expect(turn3.extractedTask?.projectId).toBe('groceries');
  });

  it('handles user cancellation gracefully', () => {
    const res = HeuristicEngine.handleVoiceDialogue(
      [
        { role: 'user', content: 'Book flight to Tokyo tomorrow' },
        { role: 'user', content: 'Never mind, cancel it' },
      ],
      currentDate,
      sampleProjects
    );
    expect(res.isComplete).toBe(false);
    expect(res.action).toBe('cancel');
    expect(res.reply).toContain('cancelled that for you');
  });
});

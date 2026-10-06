import gen1990s from './1990s-2000s.js';

const list = [gen1990s];

export const questionList = list;
export const questions = Object.fromEntries(list.map((q) => [q.id, q]));
export const defaultQuestionId = gen1990s.id;

export type IconName =
  | 'plus'
  | 'search'
  | 'calendar'
  | 'trash'
  | 'edit'
  | 'x'
  | 'refresh'
  | 'alert'
  | 'inbox'
  | 'columns';

/** 复选框/圆等形状统一用路径描述，保持 24x24 视窗的一致线条风格。 */
export const ICON_PATHS: Record<IconName, readonly string[]> = {
  plus: ['M12 5v14', 'M5 12h14'],
  search: ['M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14Z', 'M21 21l-4.35-4.35'],
  calendar: [
    'M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
    'M8 2v4',
    'M16 2v4',
    'M3 10h18',
  ],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14', 'M10 11v6', 'M14 11v6'],
  edit: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
  refresh: [
    'M21 4v6h-6',
    'M3 20v-6h6',
    'M21 10A9 9 0 0 0 6.37 3.11L3 6.6',
    'M3 14a9 9 0 0 0 14.63 6.89L21 17.4',
  ],
  alert: [
    'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z',
    'M12 9v4',
    'M12 17h.01',
  ],
  inbox: [
    'M22 12h-6l-2 3h-4l-2-3H2',
    'M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.88 4H7.12a2 2 0 0 0-1.83 1.11Z',
  ],
  columns: ['M4 4h4v16H4Z', 'M10 4h4v16h-4Z', 'M16 4h4v16h-4Z'],
};

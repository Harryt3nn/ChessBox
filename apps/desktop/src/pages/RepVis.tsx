/*apps/desktop/src/pages/RepVis.tsx */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Settings from './Settings';
import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import { HomeButton } from '../components/buttons/homeButton';
import { SettingsButton } from '../components/buttons/settingsButton';
import type { Page } from '../types/Page';
import type { MoveNode } from '../types/moveNode';
import type { GameTree } from '../types/gameTree';


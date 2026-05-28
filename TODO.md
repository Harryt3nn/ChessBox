Symbol website: https://www.w3schools.com/icons/icons_reference.asp 




Back arrow (left facing): &#xf060;
or in a circle &#xf0a8;

queen: &#xf445;
king: &#xf43f;
pawn: &#xf443;
rook: &#xf447;
bishop: &#xf43a;
knight: &#xf441;
board: 	&#xf43c;
settings cog: &#xf013;


export interface Node {
  id: string;
  repertoireId: string;
  move: string | null;            
  fen: string;
  comment: string;
  color: string;                  
  tags: string[];
  parentId: string | null;
  childIds: string[];
  transpositionEdges: string[];  
  arrows: Arrow[];
  highlightedSquares: HighlightedSquare[];
}

export interface Arrow {
  from: string;   
  to: string;     
  color: string;  
}

export interface HighlightedSquare {
  square: string; 
  color: string;  
}
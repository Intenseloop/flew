import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
  Sanitizer,
  ViewEncapsulation
} from '@angular/core';
import { Log } from '@reative/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'play-collection-log',
  templateUrl: './collection-log.component.html',
  styleUrls: ['./collection-log.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CollectionLogComponent implements OnInit {
  @Input() data: Log[] = [];
  @Input() trace: boolean;
  constructor(public dom: DomSanitizer) {}

  ngOnInit() {}
}

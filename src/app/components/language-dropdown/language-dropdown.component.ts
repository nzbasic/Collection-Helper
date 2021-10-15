import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { UtilService } from '../../services/util.service';

export interface Language {
  name: string;
  author: string;
  code: string
}

interface LanguageSelect {
  text: string,
  value: Language,
  selected: boolean
}

@Component({
  selector: 'app-language-dropdown',
  templateUrl: './language-dropdown.component.html',
})
export class LanguageDropdownComponent implements OnInit {

  public languages: Language[] = [
    { name: "English", author: "nzbasic", code: "en"},
    { name: "Russian", author: "Maks220v", code: "ru"},
  ]
  public languageItems: LanguageSelect[] = []
  public current = "English (by nzbasic)"

  constructor(private translateService: TranslateService, private utilService: UtilService) { }

  ngOnInit(): void {
    this.languageItems = this.languages.map(item => {
      return {
        text: item.name + " (by " + item.author + ")",
        value: item,
        selected: false,
      }
    })

    const currentLang = this.translateService.currentLang
    this.current = this.languageItems.find(item => item.value.code == currentLang).text
  }

  onChange() {
    let language = this.languageItems.find(item => item.selected)
    if (!language) {
      language = this.languageItems[0]
    }

    this.translateService.use(language.value.code)
    this.current = language.text
    this.utilService.setLanguage(language.value.code)
  }

}

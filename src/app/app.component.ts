// Import stylesheets
// import './style.css';

import { Observable, Subscription, of, fromEvent, from, empty, merge, timer } from "rxjs";
import { map, mapTo, switchMap, tap, mergeMap, takeUntil, filter, finalize } from "rxjs/operators";
import { Component } from "@angular/core";

declare type RequestCategory = "cats" | "meats";
const CATS_URL = "https://placekitten.com/g/{w}/{h}";
const MEATS_URL = "https://baconipsum.com/api/?type=meat-and-filler";

@Component({
  selector: "app-root",
  templateUrl: "app.component.html"
}
)
export class AppComponent {

  // Which type of data we are requesting
  public requestCategory: RequestCategory = "cats";
  // Current Polling Subscription
  public pollingSub: Subscription;

  //
  public text: HTMLElement;
  private stopPolling: Observable<Event>;
  public pollingStatus: HTMLElement;
  public catsClick: Observable<String>;
  public meatsClick: Observable<String>;
  public catImage: HTMLImageElement;


  constructor(private http: HttpClient) {

  }

  public ngOnInit(): void {


    // Gather our DOM Elements to wire up events
    const startButton = document.getElementById("start");
    const stopButton = document.getElementById("stop");
    this.text = document.getElementById("text");
    this.pollingStatus = document.getElementById("polling-status");
    const catsRadio = document.getElementById("catsCheckbox");
    const meatsRadio = document.getElementById("meatsCheckbox");
    this.catsClick = fromEvent(catsRadio, "click").pipe(mapTo("cats"));
    this.meatsClick = fromEvent(meatsRadio, "click").pipe(mapTo("meats"));
    this.catImage = <HTMLImageElement>document.getElementById("cat");
    // 5 Stop polling
    this.stopPolling = fromEvent(stopButton, "click");




  // Handle Form Updates
  this.catsClick.subscribe((category: RequestCategory) => {
      this.requestCategory = category;
      this.catImage.style.display = "block";
      this.text.style.display = "none";
  });

  this.meatsClick.subscribe((category: RequestCategory) => {
    this.requestCategory = category;
    this.catImage.style.display = "none";
    this.text.style.display = "block";
  });

  fromEvent(startButton, "click")
  .pipe(tap(_ => this.pollingStatus.innerHTML = "Started"),
  mergeMap(_ => this.watchForData(this.requestCategory))
  ).subscribe();

  }

    // 1 Constants for Cat Requests
    public mapCats = (response): Observable<string> => {
      return from(new Promise((resolve, reject) => {
          const blob = new Blob([response], {type: "image/png"});
          const reader = new FileReader();
          reader.onload = (data: any) => {
            resolve(data.target.result);
          };
          reader.readAsDataURL(blob);
      }));
    }

    // 2 Constants for Meat Requests

    public mapMeats = (response): Observable<string> => {
      const parsedData = JSON.parse(response);
      return of(parsedData ? parsedData[0] : "");
    }

  /**
   * This function will make an AJAX request to the given Url, map the
   * JSON parsed repsonse with the provided mapper function, and emit
   * the result onto the returned observable.
   3*/
  public requestData = (url: string, mapFunc: (any) => Observable<string>): Observable<string> => {
    console.log(url);
    const xhr = new XMLHttpRequest();
    return from(new Promise<string>((resolve, reject) => {

      // This is generating a random size for a placekitten image
      //   so that we get new cats each request.
      const w = Math.round(Math.random() * 400);
      const h = Math.round(Math.random() * 400);
      const targetUrl = url
        .replace("{w}", w.toString())
        .replace("{h}", h.toString());

      xhr.addEventListener("load", () => {
        resolve(xhr.response);
      });
      xhr.open("GET", targetUrl);
      if (this.requestCategory === "cats") {
        // Our cats urls return binary payloads
        //  so we need to respond as such.
        xhr.responseType = "arraybuffer";
      }
      xhr.send();
    }))
    .pipe(
      switchMap((data) => mapFunc(xhr.response)),
      tap((data) => console.log("Request result: ", data))
    );
  }


public updateDom = (result) => {
  if (this.requestCategory === "cats") {
    this.catImage.src = result;
    console.log(this.catImage);
  } else {
    this.text.innerHTML = result;
  }
}

  // 6
public watchForData = (category: RequestCategory) => {
  const url = category === "cats" ? CATS_URL : MEATS_URL;
  const mapper = category === "cats" ? this.mapCats : this.mapMeats;

  return timer(0, 5000)
    .pipe(switchMap(_ => this.requestData(url, mapper)))
    .pipe(tap(this.updateDom),
    takeUntil(merge(this.stopPolling, merge(this.catsClick, this.meatsClick).pipe(filter(c => c !== category)))),
    finalize(() => this.pollingStatus.innerHTML = "Stopped")
  );
}

}









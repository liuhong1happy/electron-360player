var $iconPlay = $("#icon-play"),$timebar = $("#timebar"),$videoContainer = $("#video-container"),$iconNext = $("#icon-next"),
    $iconPrevious = $("#icon-previous"),$videoList = $("#videolist-container"),$volumeContainer = $("#volume-container"),$playProgress = $("#play-progress"),
    $volumeProgress = $("#volume-progress"),$volumebar = $("#volumebar"),$iconVolume = $("#icon-volume"),$timebarButton = $("#timebar-button"),
    $volumeButton = $("#volume-button"),$loopButton = $("#loop-button"),$container=$("#container"),$controller=$("#controller"),
    $videolistControllerButton = $("#videolist-controller-button"),$videolistController=$("#videolist-controller"),$videolistControllerSplitter = $("#videolist-controller-splitter");

var PlayerStorage = {
    getPlayList:function(){
        var json = window.localStorage.getItem("playlist");
        var playlist = json==null ?[]:JSON.parse(json);
        for(var i=0;i<playlist.length;i++){
            var file_info = ipcRenderer.sendSync("sync-file-info",playlist[i].src);
            playlist[i].name = file_info.name;
            playlist[i].size = file_info.size;
        }
        return playlist;
    },
    setPlayList:function(playlist){
        window.localStorage.setItem("playlist",JSON.stringify(playlist));
    },
    setCurrentPlayer:function(currentplayer){
        window.localStorage.setItem("currentplayer",JSON.stringify(currentplayer));
    },
    getCurrentPlayer:function(){
        var json = window.localStorage.getItem("currentplayer");
        var currentplayer = json==null ?{
            loopType:"all-repeat", // 循环方式 ["循环播放","顺序播放","随机播放","单视频循环","单视频播放"]
            loopIndex:0,
            loopName:"循环播放",
            loopIcon:"icon-loop",
            listWidth:300
        }:JSON.parse(json);
        return currentplayer;
    }
}

var ToolTip = function(options){
    var self = {};
    var default_options = {
        content:"状态变化",
        name:"提示"
    }
    this.options = $.extend({},default_options,options);
    this.$parent = $videoContainer;
    this.$content = {};
    this.show = function(options){
        self.options = $.extend({},self.options,options);
        self.$content = $("<div class='tooltip'>"+self.options.content+"</div>").appendTo(self.$parent);
        self.$content.css({
            opacity:1
        })
    }
    this.hide = function(){
        self.$content.animate({opacity:0},3000,"",function(){
            self.$content.remove();
        })
    }
    self = this;
    return this;
}

var PlayController = function(){
    var self = {};
    this.playlist = PlayerStorage.getPlayList();
    this.loopTypes = [{id:"all-repeat",name:"循环播放",className:"icon-loop"},{id:"order",name:"顺序播放",className:"icon-list"},{id:"shuffle",name:"随机播放",className:"icon-shuffle"},{id:"repeat-once",name:"单视频循环",className:"icon-loop2"},{id:"once",name:"单视频播放",className:"icon-switch"}]
    this.current = {
        index:0,
        video:{
            name:null
        },
        player:PlayerStorage.getCurrentPlayer()
    };
    this.player = null;
    this.initPlayer = function(){
        
        var player  = new E360Palyer(document.getElementById("video-container"),null);
        player.init();
        player.resize($videoContainer.width(),$videoContainer.height());
        player.play();
        window.onresize = function(){
            player.resize($videoContainer.width(),$videoContainer.height());
        }
        player.addEventListener("playing",this.onplaying)
        player.addEventListener("ended",this.onended)
        self.player = player;
    }
    this.initController = function(){
        $iconPlay.click(function(e){
            self.togglePlay();
            var paused = self.player.getVideoPaused();
            var tooltip = new ToolTip();
            tooltip.show({
                content:"播放控制<span style='color:darkcyan;'>"+(paused?"暂停":"播放")+"</span>"
            })
            tooltip.hide();
        });
        $videoContainer.dblclick(function(e){
            self.togglePlay();
            var paused = self.player.getVideoPaused();
            var tooltip = new ToolTip();
            tooltip.show({
                content:"播放控制<span style='color:darkcyan;'>"+(paused?"暂停":"播放")+"</span>"
            })
            tooltip.hide();
        })
        $iconNext.click(function(e){
            self.playNextVideo();
            var tooltip = new ToolTip();
            tooltip.show({
                content:"播放控制<span style='color:darkcyan;'>下一视频</span>"
            })
            tooltip.hide();
        })
        $iconPrevious.click(function(e){
            self.playPrevVideo();
            var tooltip = new ToolTip();
            tooltip.show({
                content:"播放控制<span style='color:darkcyan;'>上一视频</span>"
            })
            tooltip.hide();
        })
        var hoverStatus = $iconPlay.hasClass("icon-play2");
        $timebarButton.hover(function(e){
            self.player.pause();
        },function(e){
            if(hoverStatus) self.player.pause();
            else self.player.play();
        })
        
        var moving = false,currentLeft = 0, downPositoin = {x:0,y:0},mousePosition = {x:0,y:0},currentWidthSum = 0,currentDuration = 0,currentPlayStatus=true;
        var handleMouseDown = function(e){
            if(moving) moving = false;
            downPositoin = {
                x:e.clientX,
                y:e.clientY
            }
            currentLeft = parseFloat($timebarButton.css("left"));
            currentWidthSum = parseFloat($playProgress.width());
            currentPlayStatus = $iconPlay.hasClass("icon-play2");
            currentDuration = self.player.getVideoDuration();
            self.player.pause();
            moving = true;
            e.stopPropagation(); 
            return false;
        }

        var handleMouseMove = function(e){
            if(moving){
                self.player.pause();
                
                mousePosition = {
                    x:e.clientX,
                    y:e.clientY
                }

                var dx = mousePosition.x - downPositoin.x;
                currentLeft = currentLeft + dx;
                
                if(currentLeft>currentWidthSum) { currentLeft = currentWidthSum;}
                if(currentLeft<0){ currentLeft= 0; }
                
                var percent = currentWidthSum==0? 0: currentLeft / currentWidthSum*100;
                self.player.setVideoCurrentTime(currentDuration*percent/100);
                $timebarButton.css({
                    left:percent+"%"
                })
                $timebar.css({
                    width:percent+"%"
                })
                downPositoin = {
                    x:e.clientX,
                    y:e.clientY
                }
            }
            e.stopPropagation(); 
            return false;
        }

        var handleMouseUp = function(e){
            if(moving){
                mousePosition = {
                    x:e.clientX,
                    y:e.clientY
                }

                var dx = mousePosition.x - downPositoin.x;
                currentLeft = currentLeft + dx;
                
                if(currentLeft>currentWidthSum) { currentLeft = currentWidthSum;}
                if(currentLeft<0){ currentLeft= 0; }
                
                var percent = currentWidthSum==0? 0: currentLeft / currentWidthSum*100;
                
                self.player.setVideoCurrentTime(currentDuration*percent/100);
                $timebarButton.css({
                    left:percent+"%"
                })
                $timebar.css({
                    width:percent+"%"
                })
                downPositoin = {
                    x:e.clientX,
                    y:e.clientY
                }
                moving = false;

                if(currentPlayStatus) self.player.pause();
                else self.player.play();
            }
            e.stopPropagation(); 
            return false;
        }

        $timebarButton.mousedown(handleMouseDown);
        $timebarButton.mousemove(handleMouseMove);
        $timebarButton.mouseup(handleMouseUp);
        window.addEventListener("mousemove",handleMouseMove);
        window.addEventListener("mouseup",handleMouseUp);
        
        $container.mousemove(function(e){
            if(e.clientY+200>window.innerHeight){
                $controller.css({height:50});
            }else{
                $controller.css({height:0});
            }
        })
        $container.hover(function(e){
            $videolistController.show();
        },function(){
            $controller.css({height:0});
            $volumeContainer.hide();
            $videolistController.hide();
        })
    }
    this.updatePlayList = function(){
        $videoList.find(".video-list-item").remove();
        $videoList.find(".video-list-none").remove();
        if(self.playlist.length>0){
            for(var i=0;i<self.playlist.length;i++){
                
                var active = self.playlist[i].src == self.current.video.src;
                
                var $videoListItem = $('<div class="video-list-item'+(active?" active":"")+'" id="video-list-item-'+i+'" data-index="'+i+'"></div>').appendTo($videoList);
                var $itemName = $('<span class="item-name" data-index="'+i+'" title="'+self.playlist[i].name+'" >'+self.playlist[i].name+'</span>').appendTo($videoListItem);
                var $itemClose = $('<span class="item-close" title="删除" id="item-close-'+i+'" data-index="'+i+'">&times;</span>').appendTo($videoListItem);
                $itemClose.click(function(e){
                    e = e || event;
                    var target = e.target || e.srcElement;
                    var index = $(target).attr("data-index");
                    controller.removeVideoFromList(index);
                })
                $videoListItem.dblclick(function(e){
                    e = e || event;
                    var target = e.target || e.srcElement;
                    var index = $(target).attr("data-index");
                    controller.playVideoByIndex(index);
                })
            }
        }else{
            $videoList.append("<span class='video-list-none' style='padding:10px;color:#999;display:block;text-align:center;'>播放列表没有视频<span>");
        }
        $videolistController.unbind("click",self.togglePlayList);
        $videolistController.bind("click",self.togglePlayList);
        self.saveStorage();
    }
    this.initPlayList = function(){
        self.updatePlayList();
        
        var show = !!self.current.player.listshow;
        var currentRight =0;
        if(show){
            currentRight = self.current.player.listWidth;   
            $videoContainer.removeClass("toggle");
            $videoList.removeClass("toggle");
            $videolistControllerButton.removeClass("icon-previous2");
            $videolistControllerButton.addClass("icon-next2");
        }else{
            $videoContainer.addClass("toggle");
            $videoList.addClass("toggle");
            $videolistControllerButton.addClass("icon-previous2");
            $videolistControllerButton.removeClass("icon-next2");
        }
        self.current.player.listshow = show;
        $videoContainer.css({
            right:currentRight
        })
        $videoList.css({
            width:currentRight
        })
        self.resizePlayer();
        self.saveStorage();
        
        var moving = false,currentRight = 0, downPositoin = {x:0,y:0},mousePosition = {x:0,y:0};
        var handleMouseDown = function(e){
            if(moving) moving = false;
            downPositoin = {
                x:e.clientX,
                y:e.clientY
            }
            currentRight = self.current.player.listWidth;
            moving = true;
            e.stopPropagation(); 
            return false;
        }

        var handleMouseMove = function(e){
            if(moving){
                mousePosition = {
                    x:e.clientX,
                    y:e.clientY
                }

                var dx = mousePosition.x - downPositoin.x;
                currentRight = currentRight - dx;
                if(currentRight>400) { currentRight = 400;}
                if(currentRight<100){ currentRight= 100; }

                $videoList.css({
                    width:currentRight
                });
                $videoContainer.css({
                    right:currentRight
                })
                downPositoin = {
                    x:e.clientX,
                    y:e.clientY
                }
                self.current.player.listWidth = currentRight;
                self.resizePlayer();
                self.saveStorage();
            }
            e.stopPropagation(); 
            return false;
        }

        var handleMouseUp = function(e){
            if(moving){
                mousePosition = {
                    x:e.clientX,
                    y:e.clientY
                }

                var dx = mousePosition.x - downPositoin.x;
                currentRight = currentRight - dx;
                if(currentRight>400) { currentRight = 400;}
                if(currentRight<100){ currentRight= 100; }

                $videoList.css({
                    width:currentRight
                });
                $videoContainer.css({
                    right:currentRight
                })
                downPositoin = {
                    x:e.clientX,
                    y:e.clientY
                }
                self.current.player.listWidth = currentRight;
                self.resizePlayer();
                self.saveStorage();
                moving = false;
            }
            e.stopPropagation(); 
            return false;
        }        
        
        $videolistControllerSplitter.mousedown(handleMouseDown);
        $videolistControllerSplitter.mousemove(handleMouseMove);
        $videolistControllerSplitter.mouseup(handleMouseUp);
        window.addEventListener("mousemove",handleMouseMove);
        window.addEventListener("mouseup",handleMouseUp);
        
    }
    this.initVolume = function(){
        $iconVolume.click(function(e){
            $volumeContainer.toggle();
            e.stopPropagation();
            return false;
        })
        $volumeContainer.click(function(e){
            e.stopPropagation();
            return false;
        })
        var volume = self.player.getVideoVolume();
        $volumebar.css({
            height:volume*100+"%"
        })
        $volumeButton.css({
            bottom:volume*200-9
        })

        var moving = false,currentBottom = 0, downPositoin = {x:0,y:0},mousePosition = {x:0,y:0};
        var handleMouseDown = function(e){
            if(moving) moving = false;
            downPositoin = {
                x:e.clientX,
                y:e.clientY
            }
            var volume = self.player.getVideoVolume();
            currentBottom = volume*200-9;
            moving = true;
            e.stopPropagation(); 
            return false;
        }

        var handleMouseMove = function(e){
            if(moving){
                mousePosition = {
                    x:e.clientX,
                    y:e.clientY
                }

                var dy = mousePosition.y - downPositoin.y;
                currentBottom = currentBottom - dy;
                if(currentBottom>191) { currentBottom = 191;}
                if(currentBottom<-9){ currentBottom= -9; }

                self.player.setVideoVolume((currentBottom+9)/200);
                $volumebar.css({
                    height:(currentBottom+9)/200*100+"%"
                })
                $volumeButton.css({
                    bottom:currentBottom
                })
                downPositoin = {
                    x:e.clientX,
                    y:e.clientY
                }
            }
            e.stopPropagation(); 
            return false;
        }

        var handleMouseUp = function(e){
            if(moving){
                mousePosition = {
                    x:e.clientX,
                    y:e.clientY
                }

                var dy = mousePosition.y - downPositoin.y;
                currentBottom = currentBottom - dy;
                if(currentBottom>191) { currentBottom = 191;}
                if(currentBottom<-9){ currentBottom= -9; }

                self.player.setVideoVolume((currentBottom+9)/200);
                $volumebar.css({
                    height:(currentBottom+9)/200*100+"%"
                })
                $volumeButton.css({
                    bottom:currentBottom
                })
                downPositoin = {
                    x:e.clientX,
                    y:e.clientY
                }
                moving = false;
                $container.unbind("click",handleHideVolume);
                setTimeout(function(){
                    $container.bind("click",handleHideVolume);
                },200)
            }
            e.stopPropagation(); 
            return false;
        }

        var handleHideVolume = function(e){
            $volumeContainer.hide();
            console.log("hide click")
            e.stopPropagation(); 
            return false;
        }    
        
        $volumeButton.mousedown(handleMouseDown);
        $volumeButton.mousemove(handleMouseMove);
        $volumeButton.mouseup(handleMouseUp);
        window.addEventListener("mousemove",handleMouseMove);
        window.addEventListener("mouseup",handleMouseUp);

        $container.bind("click",handleHideVolume);
    }
    this.initLoopType = function(){
        $loopButton.click(function(e){
            var player = self.current.player;
            var loopTypes = self.loopTypes;
            $loopButton.removeClass(player.loopIcon);
            player.loopIndex = (player.loopIndex+1) % loopTypes.length;
            var loopType = loopTypes[player.loopIndex];
            player.loopIcon = loopType.className;
            player.loopName = loopType.name;
            player.loopType = loopType.id;
            $loopButton.addClass(player.loopIcon);
            $loopButton.attr("title",player.loopName);
            var tooltip = new ToolTip();
            tooltip.show({
                content:"循环播放方式切换为<span style='color:darkcyan;'>"+player.loopName+"</span>"
            })
            tooltip.hide();
            e.stopPropagation();
            return false;
        })
    }
    this.togglePlay = function(){
        var paused = self.player.getVideoPaused();
        if(paused){
            self.player.play();
            $iconPlay.removeClass("icon-play2").addClass("icon-pause");
        }else{
            self.player.pause();
            $iconPlay.addClass("icon-play2").removeClass("icon-pause");
        }
    }
    this.playPrevVideo = function(){
        if(self.playlist.length>0){
            var index = self.current.index;
            index = (index+self.playlist.length-1)%self.playlist.length;
            var filePath = self.playlist[index].src;
            // 修改播放器视频路径并开始播放
            self.player.pause();
            self.player.setVideoSrc(filePath);
            self.togglePlay();
            self.player.play();
            self.current.index = index;
            self.current.video = self.playlist[index];
        }
    }
    this.playNextVideo = function(){
        if(self.playlist.length>0){
            var index = self.current.index;
            index = (index+1)%self.playlist.length;
            var filePath = self.playlist[index].src;
            // 修改播放器视频路径并开始播放
            self.player.pause();
            self.player.setVideoSrc(filePath);
            self.togglePlay();
            self.player.play();
            self.current.index = index;
            self.current.video = self.playlist[index];
        }
    }
    this.addVideoToList = function(file_info){
        var exists = self.playlist.filter(function(ele,pos){
            ele.index = pos;
            return ele.src == file_info.src;
        });
        if(exists.length>0){
            self.current.index = exists[0].index;
            self.current.video = self.playlist[self.current.index];
        }else{
            self.playlist.push(file_info);
            self.current.index = self.playlist.length-1;
            self.current.video = self.playlist[self.current.index];
        }
        // 修改播放器视频路径并开始播放
        self.player.pause();
        self.player.setVideoSrc(file_info.src);
        self.player.play();
        // 更新播放列表
        self.updatePlayList();
    }
    this.removeVideoFromList = function(index){
        var i = parseInt(index);
        self.playlist.splice(i,1);
        if(self.current.index == i){
            self.current.index = (self.current.index-1)%self.playlist.length;
        }
        if(self.current.index>i){
             self.current.index = self.current.index-1;
        }
        // 更新播放列表
        self.updatePlayList();
    }

    this.playVideoByIndex = function(index){
        var index = parseInt(index);
        var filePath = self.playlist[index].src;
        // 修改播放器视频路径并开始播放
        self.player.pause();
        self.player.setVideoSrc(filePath);
        self.player.play();
        self.current.index = index;
        self.current.video = self.playlist[self.current.index];
        // 更新播放列表
        self.updatePlayList();
    }

    this.togglePlayList = function(){
        var show = $videoContainer.hasClass("toggle");
        var currentRight =0;
        if(show){
            currentRight = self.current.player.listWidth;   
        }
        self.current.player.listshow = show;
        $videoContainer.css({
            right:currentRight
        })
        $videoList.css({
            width:currentRight
        })
        $videoContainer.toggleClass('toggle');
        $videoList.toggleClass('toggle');
        self.resizePlayer();
        self.saveStorage();
        $videolistControllerButton.toggleClass(function(index,oldClass){
            return oldClass.indexOf("icon-next2") !=-1?"icon-previous2":"icon-next2";
        },true);
        $videolistControllerButton.toggleClass(function(index,oldClass){
            return oldClass.indexOf("icon-next2")>5?"icon-previous2":"icon-next2";
        },false);
    }
    
    this.togglePlayControl = function(){
        $container.toggleClass('toggle');
        $controller.toggleClass('toggle');
        self.resizePlayer();
    }
    
    this.resizePlayer = function(){
        for(var i=0;i<60;i++){
            setTimeout(function(){
                var width = $videoContainer.width();
                var height = $videoContainer.height();
                self.player.resize(width,height);
            },30*i)
        }
    }
    
    this.setFullScreen = function(flag){
        if(flag){
             $videoList.show();
             $videoContainer.css({"width":"100%"});
        }else{
            $videoList.hide();
            $videoContainer.css({"width":"auto"});
        }
    }

    
    this.init = function(){
        self.initPlayer();
        self.initController();
        self.initPlayList();
        self.initVolume();
        self.initLoopType();
    }
    
    this.onplaying = function(){
        var duration = self.player.getVideoDuration();
        var currentTime = self.player.getVideoCurrentTime();
        var width = self.player.getVideoWidth();
        var height = self.player.getVideoHeight();
        if(duration && !isNaN(duration) && currentTime && !isNaN(currentTime) ){
            $timebar.css({
                width: (currentTime*100/duration)+ "%"
            })
            $timebarButton.css({
                left: (currentTime*100/duration)+ "%"
            })
        }
        if(self.current.video && self.current.video.name){
            self.current.video.duration = duration;
            self.current.video.currentTime = currentTime;
            self.current.video.height = height;
            self.current.video.width = width;
            self.current.video.paused = false;
            document.title = "360度全景视频播放器-"+self.current.video.name
        }else{
             document.title = "360度全景视频播放器"
        }
    }
    this.onended = function(){
        if(self.playlist.length==0) return;
        if(self.current.player.loopType == "repeat-once") return;
        if(self.current.player.loopType == "once"){
            self.player.pause();
            self.player.setVideoCurrentTime(0);
        }
        if(self.current.player.loopType == "order"){
            if(self.current.index==self.playlist.length-1){
                self.player.pause();
                self.player.setVideoCurrentTime(0);
                return;
            }
            var index = (self.current.index+1) % self.playlist.length;
            var src = self.playlist[index].src;
            self.player.pause();
            self.player.setVideoSrc(src);
            self.player.setVideoCurrentTime(0);
            self.player.play();
            self.current.index = index;
        }
        if(self.current.player.loopType == "all-repeat"){
            var index = (self.current.index+1) % self.playlist.length;
            var src = self.playlist[index].src;
            self.player.pause();
            self.player.setVideoSrc(src);
            self.player.setVideoCurrentTime(0);
            self.player.play();
            self.current.index = index;
        }

        if(self.current.player.loopType == "shuffle"){
            var index = new Date().valueOf();
            index = (index+1) % self.playlist.length;
            var src = self.playlist[index].src;
            self.player.pause();
            self.player.setVideoSrc(src);
            self.player.setVideoCurrentTime(0);
            self.player.play();
            self.current.index = index;
        }
        self.current.video = self.playlist[self.current.index];
        self.current.video.currentTime = 0;
        self.updatePlayList();
    }
    
    this.saveStorage = function(){
        PlayerStorage.setPlayList(self.playlist);
        PlayerStorage.setCurrentPlayer(self.current.player);
    }
    self = this;
    return this;
}